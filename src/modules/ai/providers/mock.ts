// =============================================================================
// Mock Dev Provider
// =============================================================================
// High-fidelity offline provider for local development when no LLM key is
// configured. Never used in production (see provider-factory.ts).
// =============================================================================

import type { AIProvider, ChatMessage, ProviderResult } from "../provider";
import { EMPTY_USAGE } from "../provider";
import type { GeneratedContent, GenerationInput } from "../schemas";

export class MockDevProvider implements AIProvider {
  readonly name = "mock-dev";

  private build(input: GenerationInput): GeneratedContent {
    const isArabic = input.language === "ar";

    if (input.platform === "youtube") {
      return {
        platform: "youtube",
        content: {
          titles: isArabic
            ? [
                `سر ${input.niche} الذي لا يخبرك به المحترفون في 2026`,
                `كيف تتقن ${input.idea.slice(0, 30)}... خطوة بخطوة`,
                `توقف عن إضاعة وقتك! الدليل الشامل لـ ${input.niche}`,
              ]
            : [
                `The Hidden ${input.niche} Strategy Nobody Talks About in 2026`,
                `How to Master ${input.idea.slice(0, 30)} (Step-by-Step)`,
                `Stop Wasting Time: The Real Truth About ${input.niche}`,
              ],
          openingHook: isArabic
            ? `إذا كنت تعتقد أن النجاح في ${input.niche} يتطلب سنوات من العمل الشاق، فأنت على وشك اكتشاف خطأ شائع يقع فيه 95% من الناس...`
            : `If you think succeeding in ${input.niche} takes years of trial and error, you're about to see the exact formula that 95% of creators miss...`,
          description: isArabic
            ? `في هذا الفيديو، نكشف بالتفصيل كيفية تطبيق: ${input.idea}.\n\n📌 المحاور الرئيسية:\n0:00 - الصدمة الأولى\n01:45 - الاستراتيجية الخفية\n04:30 - التطبيق العملي\n\nاشترك في القناة لمزيد من استراتيجيات النمو المتقدمة.`
            : `In this breakdown, we dive deep into: ${input.idea}.\n\n📌 Timestamps:\n0:00 - The Hook\n01:45 - The Breakthrough Strategy\n04:30 - Actionable Blueprint\n\nSubscribe for more growth blueprints.`,
          tags: [input.niche, "growth", "strategy", "tutorial", "2026"],
          hashtags: ["#growth", "#creator", "#youtube", "#content"],
          callToAction: isArabic
            ? `شاركنا رأيك في التعليقات: ما هي أكبر عقبة تواجهك حالياً؟`
            : `Drop a comment below with your biggest obstacle right now, and let's solve it together.`,
          thumbnailIdeas: [
            "Split screen: Before (frustrated) vs After (massive graph surge)",
            "High contrast text: 'STOP DOING THIS'",
            "Surprised reaction looking at a 10x metric surge",
          ],
        },
      };
    }

    if (input.platform === "tiktok") {
      return {
        platform: "tiktok",
        content: {
          openingHook: isArabic
            ? `توقف عن التمرير! هذا السر في ${input.niche} غيّر كل شيء تماماً...`
            : `Stop scrolling. If you're struggling with ${input.niche}, this one concept will blow your mind...`,
          caption: isArabic
            ? `الحقيقة الصادمة حول ${input.idea.slice(0, 40)} 👇 جربها وأخبرني بالنتيجة!`
            : `The unfiltered truth about ${input.idea.slice(0, 40)} 👇 Save this for later!`,
          hashtags: ["#foryou", "#fyp", "#growthtips", "#contentcreator"],
          script: isArabic
            ? `[0-2s]: (انظر مباشرة للكاميرا بإشارة سريعة) توقف عن التمرير إذا كنت ترغب في مضاعفة نتائجك في ${input.niche}.\n\n[3-10s]: المشكلة أن معظم الناس يركزون على الأدوات الخاطئة بدلاً من التركيز على المبدأ الأساسي: ${input.idea}.\n\n[10-25s]: إليك ما يجب أن تفعله بدلاً من ذلك: أولاً، حدد هدفك بوضوح. ثانياً، قم بالأتمتة السريعة. وثالثاً، استمرارية النشر.\n\n[25-30s]: احفظ هذا الفيديو وشاركه مع صديق يحتاج هذه النصيحة!`
            : `[0-2s]: (Look directly at the camera with hand gesture) Stop scrolling if you want to 10x your progress in ${input.niche}.\n\n[3-10s]: Most people fail because they fixate on vanity metrics instead of: ${input.idea}.\n\n[10-25s]: Here is the 3-step framework: Step 1, audit your baseline. Step 2, eliminate friction. Step 3, double down on what works.\n\n[25-30s]: Hit follow and save this video for your next session!`,
          callToAction: isArabic
            ? `اضغط على زر المتابعة لمزيد من أسرار صناعة المحتوى!`
            : `Hit follow for daily high-growth insights!`,
          suggestedSounds: ["Trending Lo-Fi Beat", "Dramatic Bass Drop"],
        },
      };
    }

    // Instagram
    if (input.contentType === "carousel") {
      return {
        platform: "instagram",
        contentType: "carousel",
        content: {
          slides: [
            {
              heading: isArabic
                ? `الدليل الشامل لـ ${input.niche}`
                : `The Blueprint for ${input.niche}`,
              body: isArabic
                ? `كيف تنتقل من الصفر إلى الاحتراف باستخدام: ${input.idea.slice(0, 50)} ➡️ اسحب الشاشة`
                : `How to go from zero to momentum using: ${input.idea.slice(0, 50)} ➡️ Swipe`,
            },
            {
              heading: isArabic ? "الخطأ الأكثر شيوعاً" : "The #1 Critical Mistake",
              body: isArabic
                ? "تكرار نفس الاستراتيجيات القديمة وتوقع نتائج مختلفة في 2026."
                : "Relying on outdated 2022 algorithms and expecting viral reach in 2026.",
            },
            {
              heading: isArabic ? "الحل السريع والفعال" : "The High-Leverage Shift",
              body: isArabic
                ? `التركيز الكامل على القيمة الملموسة وسرعة إيصال الفكرة.`
                : `Focus exclusively on high-signal clarity and ruthless hook delivery.`,
            },
            {
              heading: isArabic ? "خطتك للتنفيذ اليوم" : "Your Immediate Action Plan",
              body: isArabic
                ? "ابدأ بتجربة فكرة واحدة يومياً لمدة 14 يوماً وراقب نمو متابعيك."
                : "Ship 1 focused piece of content daily for 14 days and measure retention.",
            },
            {
              heading: isArabic ? "احفظ هذا البوست 📌" : "Save This Post 📌",
              body: isArabic
                ? "اضغط على أيقونة الحفظ للرجوع إليه لاحقاً وشاركه في قصتك."
                : "Bookmark this carousel for your next planning session & share with a creator friend.",
            },
          ],
          caption: isArabic
            ? `إليك الخريطة الكاملة لـ ${input.niche} في 5 شرائح عملية.\n\nأي شريحة أثرت فيك أكثر؟ اكتب رقمها بالتعليقات! 👇`
            : `Here is the full playbook for ${input.niche} in 5 slides.\n\nWhich slide hit closest to home? Drop the number below! 👇`,
          hashtags: ["#instagramtips", "#carousel", "#creators", "#growthhacks"],
          callToAction: isArabic
            ? "احفظ البوست وشاركه مع صانع محتوى طموح!"
            : "Save this post and share it with your network!",
        },
      };
    } else {
      // Instagram Reel
      return {
        platform: "instagram",
        contentType: "reel",
        content: {
          openingHook: isArabic
            ? `هذا التكتيك السري في ${input.niche} سيغير طريقتك في النشر تماماً!`
            : `This subtle ${input.niche} tweak will change how you create forever!`,
          caption: isArabic
            ? `كل ما تحتاج لمعرفته حول ${input.idea.slice(0, 40)}... التفاصيل كاملة بالسيناريو! 👇`
            : `Everything you need to know about ${input.idea.slice(0, 40)}... Breakdown below! 👇`,
          hashtags: ["#reels", "#instagramreels", "#creatorgrowth", "#viralreels"],
          callToAction: isArabic
            ? "احفظ الريل وتابع الحساب للمزيد!"
            : "Save this reel and follow for daily strategies!",
          script: isArabic
            ? `[0-3s]: اللقطة الأولى: إشارة سريعة مع نص واضح على الشاشة.\n[3-12s]: اشرح المشكلة بإيجاز.\n[12-25s]: قدم الحل بثلاث خطوات واضحة.\n[25-30s]: دعوة للحفظ والمتابعة.`
            : `[0-3s]: Bold punchy hook with on-screen kinetic text.\n[3-12s]: Present the counter-intuitive problem.\n[12-25s]: Deliver the 3-step high-retention fix.\n[25-30s]: Clear call to action to save and follow.`,
          suggestedAudioMood: "Upbeat Corporate Electronic / Fast Lo-Fi",
        },
      };
    }
  }

  async generateContent(input: GenerationInput): Promise<ProviderResult<GeneratedContent>> {
    return { data: this.build(input), usage: EMPTY_USAGE, providerName: this.name };
  }

  async chat(messages: ChatMessage[]): Promise<ProviderResult<string>> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const isArabic = /[\u0600-\u06FF]/.test(lastUser?.content ?? "");
    const data = isArabic
      ? "(وضع التطوير) هذا رد تجريبي من مدرب النمو. أضف مفتاح GROQ_API_KEY أو GEMINI_API_KEY للحصول على إجابات حقيقية."
      : "(Dev mode) This is a sample Growth Coach reply. Add GROQ_API_KEY or GEMINI_API_KEY to get real answers.";
    return { data, usage: EMPTY_USAGE, providerName: this.name };
  }
}
