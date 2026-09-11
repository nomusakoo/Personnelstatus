const test = require('node:test');
const assert = require('node:assert/strict');
const { isImagePolicy } = require('../src/commands/policyImage');

test('isImagePolicy: "연도별"/"인력"/"현황"이 모두 포함된 제목이면 이미지 대상', function () {
  assert.equal(isImagePolicy('연도별 인력현황'), true);
  // 실제 문서 내부 제목처럼 "인력"과 "현황" 사이에 다른 말이 끼어 있어도 매칭돼야 함
  assert.equal(isImagePolicy('연도별 농우바이오 인력 일반현황'), true);
});

test('isImagePolicy: 다른 제도 항목(경조휴가 등)은 이미지 대상이 아님', function () {
  assert.equal(isImagePolicy('경조휴가'), false);
  assert.equal(isImagePolicy('경조금'), false);
  assert.equal(isImagePolicy('해외법인 현황 등'), false); // "연도별"이 없음
});
