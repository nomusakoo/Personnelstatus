const { Bot, InputFile } = require('grammy');

const { loadConfig } = require('./config');
const { createSupabaseClient } = require('./data/supabaseClient');
const { isAllowed } = require('./auth/whitelist');
const { classify } = require('./commands/router');
const { handleNameSearch } = require('./commands/nameSearch');
const { getOrgChartImage } = require('./commands/orgChart');
const { getExecCalendarImage } = require('./commands/execCalendar');
const repository = require('./data/repository');

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
    await ctx.reply("이름을 입력하시거나 '조직도' / '임원일정'을 입력해 주세요.");
    return;
  }

  const cmd = classify(text);
  try {
    if (cmd.type === 'orgChart') {
      const png = await getOrgChartImage(sb);
      // replyWithPhoto는 텔레그램이 JPEG로 재압축해 표/글자가 뭉개져 보임 —
      // 문서(document)로 보내면 원본 PNG 그대로 전달되어 화질이 유지됨
      await ctx.replyWithDocument(new InputFile(png, 'orgchart.png'));
    } else if (cmd.type === 'execCalendar') {
      const png = await getExecCalendarImage(sb, cmd.month, sb2);
      await ctx.replyWithDocument(new InputFile(png, 'exec-calendar.png'));
    } else if (cmd.type === 'nameSearch') {
      const reply = await handleNameSearch(sb, repository, cmd.query);
      await ctx.reply(reply);
    } else {
      await ctx.reply("이름을 입력하시거나 '조직도' / '임원일정'을 입력해 주세요.");
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
