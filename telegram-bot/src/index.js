const { Bot } = require('grammy');

const { loadConfig } = require('./config');
const { createSupabaseClient } = require('./data/supabaseClient');
const { isAllowed } = require('./auth/whitelist');
const { classify } = require('./commands/router');
const { resolveTextQuery } = require('./commands/resolve');
const { getOrgChartText } = require('./commands/orgChart');
const { getExecCalendarText } = require('./commands/execCalendar');
const { mainKeyboard, buildHelpText } = require('./keyboard');
const { chunkText } = require('./util');

// 채팅창 하단 고정 메뉴(mainKeyboard)를 계속 보이게 하기 위해, 응답의 마지막 조각에만
// reply_markup을 붙인다(모든 조각에 붙여도 되지만 중복이라 마지막에만 붙임).
async function replyChunks(ctx, text) {
  const chunks = chunkText(text);
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    await ctx.reply(chunks[i], isLast ? { reply_markup: mainKeyboard } : undefined);
  }
}

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const sb = createSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey);
// 외부 연동 임원일정(선택) — SUPABASE2_* 둘 다 설정된 경우에만 활성화
const sb2 = (config.supabase2Url && config.supabase2ServiceRoleKey)
  ? createSupabaseClient(config.supabase2Url, config.supabase2ServiceRoleKey)
  : null;
const bot = new Bot(config.telegramToken);

bot.on('message', async function (ctx) {
  const userId = ctx.from && ctx.from.id;
  if (!isAllowed(userId, config.allowedIds)) {
    // 화이트리스트에 없는 발신자 — 어떤 명령이 있는지 힌트를 주지 않고 거부만 안내
    await ctx.reply('이 봇을 사용할 권한이 없습니다.');
    return;
  }

  const text = ctx.message.text;
  if (!text) {
    // 사진/스티커 등 텍스트가 아닌 메시지
    await ctx.reply("이름을 입력하시거나 '조직도' / '임원일정'을 입력해 주세요.", { reply_markup: mainKeyboard });
    return;
  }

  const cmd = classify(text);
  try {
    if (cmd.type === 'help') {
      await ctx.reply(buildHelpText(), { reply_markup: mainKeyboard });
    } else if (cmd.type === 'orgChart') {
      const orgText = await getOrgChartText(sb);
      await replyChunks(ctx, orgText);
    } else if (cmd.type === 'execCalendar') {
      const calText = await getExecCalendarText(sb, cmd.month, sb2);
      await replyChunks(ctx, calText);
    } else if (cmd.type === 'nameSearch') {
      // 이름/조직명/대시보드 키워드 중 무엇에 해당하는지는 resolveTextQuery가 판단한다.
      const reply = await resolveTextQuery(sb, cmd.query);
      await replyChunks(ctx, reply);
    } else {
      await ctx.reply("이름을 입력하시거나 '조직도' / '임원일정'을 입력해 주세요.", { reply_markup: mainKeyboard });
    }
  } catch (err) {
    console.error('[bot] 명령 처리 오류:', err);
    await ctx.reply('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
});

bot.catch(function (err) {
  console.error('[bot] 처리되지 않은 오류:', err);
});

bot.start().catch(function (err) {
  console.error('[bot] 시작 실패 — TELEGRAM_BOT_TOKEN이 올바른지 확인하세요:', err.message || err);
  process.exit(1);
});

console.log('[bot] 인원현황 텔레그램봇 시작됨 (롱폴링)');
