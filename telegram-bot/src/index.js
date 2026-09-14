const { Bot, InputFile } = require('grammy');

const { loadConfig } = require('./config');
const { createSupabaseClient } = require('./data/supabaseClient');
const { isAllowed } = require('./auth/whitelist');
const { classify } = require('./commands/router');
const { resolveTextQuery } = require('./commands/resolve');
const { buildTopMenu, handleOrgCallback } = require('./commands/orgChartNav');
const { getExecCalendarText, getExecCalendarTextForYearMonth } = require('./commands/execCalendar');
const { buildExecCalendarMenu, resolveExecCalendarTarget } = require('./commands/execCalendarNav');
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
      // 예전에는 전체 조직도를 바로 텍스트로 보냈지만, 본부/센터/팀 단위로 눌러
      // 들어가며 원하는 범위만 좁혀 볼 수 있도록 버튼 메뉴를 먼저 보여준다.
      const { divisions } = await repository.getOrgSnapshot(sb);
      const menu = buildTopMenu(divisions);
      await ctx.reply(menu.text, { reply_markup: menu.keyboard });
    } else if (cmd.type === 'execCalendar') {
      if (cmd.month) {
        // "임원일정 10월"처럼 달을 직접 지정한 경우는 기존처럼 바로 그 달을 보여준다.
        const calText = await getExecCalendarText(sb, cmd.month, sb2);
        await replyChunks(ctx, calText);
      } else {
        // 그냥 "임원일정"만 입력했으면 이번달/다음달 중 고를 수 있는 버튼을 먼저 보여준다.
        const menu = buildExecCalendarMenu();
        await ctx.reply(menu.text, { reply_markup: menu.keyboard });
      }
    } else if (cmd.type === 'nameSearch') {
      // 이름/조직명/대시보드 키워드 중 무엇에 해당하는지는 resolveTextQuery가 판단한다.
      // 제도 항목에 표가 있으면 { html: '...' } 형태로, 데이터가 방대해 이미지로 내보내야
      // 하는 항목(연도별 인력현황 등)은 { image, filename, caption } 형태로 온다.
      // 이미지는 "사진"이 아니라 "문서"로 보내야 텔레그램이 재압축을 하지 않아 깨지지 않는다.
      const reply = await resolveTextQuery(sb, cmd.query, sb2);
      if (reply && typeof reply === 'object' && reply.image) {
        await ctx.replyWithDocument(new InputFile(reply.image, reply.filename), {
          caption: reply.caption,
          reply_markup: mainKeyboard,
        });
      } else if (reply && typeof reply === 'object' && reply.html) {
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

// callback_data 하나를 실제 동작으로 바꾼다. "org"로 시작하면 조직도 메뉴/결과,
// "exec:"로 시작하면 임원일정 이번달/다음달 결과 — 그 외(또는 유효하지 않은 상태)는 null.
async function handleCallbackData(data) {
  if (data.indexOf('org') === 0) {
    const snapshot = await repository.getOrgSnapshot(sb);
    return handleOrgCallback(data, snapshot);
  }
  if (data.indexOf('exec:') === 0) {
    const target = resolveExecCalendarTarget(data);
    if (!target) return null;
    const text = await getExecCalendarTextForYearMonth(sb, target.year, target.month, sb2);
    return { kind: 'result', text: text };
  }
  return null;
}

// 조직도/임원일정 메뉴의 인라인 버튼을 눌렀을 때 오는 콜백. 메뉴 이동(kind: 'menu',
// 조직도의 본부/센터 목록)은 같은 메시지를 편집해 갈아끼우고, 실제 조회 결과
// (kind: 'result', 인원 명단/임원일정)는 길이 제한 때문에 새 메시지로 보낸다 —
// 그래야 메뉴 버튼이 있는 메시지가 안 깨진다.
bot.on('callback_query:data', async function (ctx) {
  const userId = ctx.from && ctx.from.id;
  if (!isAllowed(userId, config.allowedIds)) {
    await ctx.answerCallbackQuery({ text: '이 봇을 사용할 권한이 없습니다.', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery.data;
  if (!data || (data.indexOf('org') !== 0 && data.indexOf('exec:') !== 0)) {
    await ctx.answerCallbackQuery();
    return;
  }

  try {
    const result = await handleCallbackData(data);
    if (!result) {
      await ctx.answerCallbackQuery({ text: '메뉴가 오래되었습니다. 다시 입력해 주세요.', show_alert: true });
      return;
    }
    if (result.kind === 'menu') {
      await ctx.editMessageText(result.text, { reply_markup: result.keyboard });
    } else {
      await replyChunks(ctx, result.text);
    }
    await ctx.answerCallbackQuery();
  } catch (err) {
    // 같은 버튼을 연달아 눌러 내용이 바뀌지 않았을 때 텔레그램이 던지는 오류는
    // 무해하므로 조용히 무시한다.
    if (err && /message is not modified/i.test(err.description || err.message || '')) {
      await ctx.answerCallbackQuery();
      return;
    }
    console.error('[bot] 버튼 처리 오류:', err);
    await ctx.answerCallbackQuery({ text: '일시적인 오류가 발생했습니다.', show_alert: true });
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
