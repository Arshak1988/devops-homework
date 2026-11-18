// Short version of a topic, used for cards, the roadmap and progress.
// Shared by server.js (/api/topics) and scripts/build.js (api/topics.json).
module.exports = function toSummary(t) {
  return {
    slug: t.slug,
    title: t.title,
    short: t.short,
    icon: t.icon,
    level: t.level,
    time: t.time,
    tagline: t.tagline,
    concepts: t.concepts.map((c) => c.t),
    lessons: t.sections.length + 3,
    questions: t.quiz.length,
  };
};
