const { Bot } = require('grammy');

const { loadConfig } = require('./config');
const { createSupabaseClient } = require('./data/supabaseClient');
const { isAllowed } = require('./auth/whitelist');
const { classify } = require('./commands/router');
const { resolveTextQuery } = require('./commands/resolve');
const { getOrgChartText } = require('./commands/orgChart');
const { getExecCalendarText } = require('./commands/execCalendar');
const { mainKeyboard, buildHelpText } = require('./keyboard');
const repository = require('./data/repository');
const { chunkText, chunkBlocks } = require('./util');

// 채팅창 하단 고정 메뉴(mainKeyboard)를 계속 보이게 하기 위해, 응답의 마지막 조각에만
// reply_markup을 붙인다(모든 조각에 붙여도 되지만 중복이라 마지막에만 붙임).
async function replyChunks(ctx, text) {
  const chunks = chunkText(text);
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    await ctx.reply(chunks[i], isLast ? { reply_markup: mainKeyboard } : undefined);
  }
}

// 제도 조회처럼 <pre> 표가 들어간 HTML 메시지 전용 — 블록(빈 줄) 경계에서만 나눠
// <pre>...</pre> 태그가 청크 사이에서 끊기지 않게 하고, parse_mode:'HTML'로 보낸다.
async function replyChunksHtml(ctx, html) {
  const chunks = chunkBlocks(html);
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    const opts = { parse_mode: 'HTML' };
    if (isLast) opts.reply_markup = mainKeyboard;
    await ctx.reply(chunks[i], opts);
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
      // 제도 목록 조회 실패는 도움말 전체를 깨뜨리지 않도록 조용히 무시한다.
      const policies = sb2 ? await repository.getHrPolicies(sb2).catch(function () { return []; }) : [];
      await replyChunks(ctx, buildHelpText(policies));
    } else if (cmd.type === 'orgChart') {
      const orgText = await getOrgChartText(sb);
      await replyChunks(ctx, orgText);
    } else if (cmd.type === 'execCalendar') {
      const calText = await getExecCalendarText(sb, cmd.month, sb2);
      await replyChunks(ctx, calText);
    } else if (cmd.type === 'nameSearch') {
      // 이름/조직명/대시보드 키워드 중 무엇에 해당하는지는 resolveTextQuery가 판단한다.
      // 제도 항목에 표가 있으면 { html: '...' } 형태로 오므로 HTML parse_mode로 보낸다.
      const reply = await resolveTextQuery(sb, cmd.query, sb2);
      if (reply && typeof reply === 'object' && reply.html) {
        await replyChunksHtml(ctx, reply.html);
      } else {
        await replyChunks(ctx, reply);
      }
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
