import { createHash } from "node:crypto";

const TEXT_LIMITS = Object.freeze({
  title: 100,
  hook: 48,
  summary: 100,
  reason: 100,
  narration: 320,
});

const TITLE_TEMPLATES = Object.freeze({
  WHY_NOW: (keyword) => `${keyword}, 관련 영상으로 보는 현재 맥락`,
  KEYWORD_PRIMER: (keyword) => `${keyword}, 어떤 키워드인지 살펴보기`,
  PERSON_WORK_RELATION: (keyword) => `${keyword}, 관련 작품과 함께 보기`,
  EVENT_KEYWORD_MAP: (keyword) => `${keyword}, 연결된 표현으로 맥락 읽기`,
  CONTEXT_TIMELINE: (keyword) => `${keyword}, 관련 영상 흐름으로 살펴보기`,
  WEEKLY_BUNDLE: (keyword) => `${keyword}, 이번에 함께 볼 키워드`,
});

function fitText(value, maximumCharacters) {
  const characters = Array.from(value.trim());
  if (characters.length <= maximumCharacters) return characters.join("");
  return `${characters.slice(0, maximumCharacters - 1).join("")}…`;
}

function normalizeTopicWord(word) {
  return word.normalize("NFKC").replace(/\s+/gu, " ").trim().toLocaleLowerCase("ko-KR");
}

export function createCanonicalTopicKey(keyword) {
  if (typeof keyword !== "string" || keyword.trim().length === 0) {
    throw new Error("keyword must be a non-empty string to create a topic key.");
  }
  const digest = createHash("sha256")
    .update(normalizeTopicWord(keyword), "utf8")
    .digest("hex")
    .slice(0, 12);
  return `keyword-${digest}`;
}

function createReasons(factCards) {
  const first = factCards[0];
  const second = factCards[1];
  return [
    fitText(`'${first.sourceExcerpt}' 표현은 '${first.title}' 영상 정보에서 확인됩니다.`, TEXT_LIMITS.reason),
    second
      ? fitText(`'${second.sourceExcerpt}' 표현은 '${second.title}' 영상 정보에서 확인됩니다.`, TEXT_LIMITS.reason)
      : fitText(`선택한 영상의 게시 채널은 '${first.channelName}'입니다.`, TEXT_LIMITS.reason),
  ];
}

export function composeEditorialDraft({ candidate, selection, factCards }) {
  if (!candidate || typeof candidate.keyword !== "string") {
    throw new Error("candidate.keyword is required to compose an editorial draft.");
  }
  if (!selection || !TITLE_TEMPLATES[selection.editorialFormat]) {
    throw new Error("selection.editorialFormat is not supported.");
  }
  if (!Array.isArray(factCards) || factCards.length === 0) {
    throw new Error("factCards must contain at least one item.");
  }

  const keyword = candidate.keyword.trim();
  const title = fitText(TITLE_TEMPLATES[selection.editorialFormat](keyword), TEXT_LIMITS.title);
  const hook = fitText(`오늘의 키워드, ${keyword}`, TEXT_LIMITS.hook);
  const summary = fitText(
    `관련 영상 ${factCards.length}개의 제목과 채널 정보를 기준으로 '${keyword}'의 맥락을 정리했습니다.`,
    TEXT_LIMITS.summary,
  );
  const reasons = createReasons(factCards);
  const topicKey = createCanonicalTopicKey(keyword);
  const audienceAngle = fitText(
    `30~40대 사용자가 '${keyword}'의 현재 맥락을 관련 영상 메타데이터로 이해하도록 설명합니다.`,
    500,
  );
  const selectionReason = fitText(
    `운영 후보 '${keyword}'에 연결된 관련 영상 ${factCards.length}개의 제목과 채널 정보를 근거로 선택했습니다.`,
    2_000,
  );
  const evidenceClaims = reasons.map((statement, index) => ({
    reasonIndex: index,
    statement,
    evidenceVideoId: factCards[Math.min(index, factCards.length - 1)].videoId,
    sourceExcerpt: factCards[Math.min(index, factCards.length - 1)].sourceExcerpt,
  }));

  return {
    primaryKeywordId: candidate.keywordId,
    editorialFormat: selection.editorialFormat,
    topicKey,
    audienceAngle,
    selectionReason,
    title,
    relatedKeywordIds: [...selection.relatedKeywordIds],
    hook,
    summary,
    reasons,
    narration: {
      hook: fitText(`오늘의 키워드는 '${keyword}'입니다.`, TEXT_LIMITS.narration),
      overview: fitText(
        `30~40대가 이해하기 쉽게 '${keyword}' 관련 영상 메타데이터를 살펴봅니다.`,
        TEXT_LIMITS.narration,
      ),
      reasons: fitText(reasons.join(" "), TEXT_LIMITS.narration),
      evidence: fitText(
        factCards
          .map((card) => `제목 '${card.title}', 채널 '${card.channelName}'에서 선택 근거를 확인했습니다.`)
          .join(" "),
        TEXT_LIMITS.narration,
      ),
      cta: "더 자세한 내용은 트렌드집 프로필 링크에서 확인해 보세요.",
    },
    evidenceClaims,
  };
}
