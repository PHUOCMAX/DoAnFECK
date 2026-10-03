import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Bot,
  ExternalLink,
  MapPin,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import UserLayout from "../../components/user/UserLayout";
import { useLanguage } from "../../i18n";
import {
  chatWithAgent,
} from "../../services/agentService";
import {
  getUserToken,
} from "../../services/userService";

/* =========================================================
   CONSTANTS
========================================================= */

const SUGGESTED_QUESTIONS = [
  {
    vi: "Địa điểm nào đáng tham quan gần tôi?",
    en: "What places are worth visiting near me?",
    zh: "我附近有哪些值得参观的地方？",
    ja: "近くで訪れる価値のある場所はどこですか？",
    ko: "근처에서 방문할 만한 곳은 어디인가요?",
    fr: "Quels sont les endroits intéressants à visiter près de moi ?",
    de: "Welche Sehenswürdigkeiten gibt es in meiner Nähe?",
    es: "¿Qué lugares vale la pena visitar cerca de mí?",
    it: "Quali sono i luoghi da visitare vicino a me?",
    pt: "Quais lugares vale a pena visitar perto de mim?",
    ru: "Какие интересные места стоит посетить рядом со мной?",
    th: "มีสถานที่ท่องเที่ยวที่น่าสนใจใกล้ฉันที่ไหนบ้าง?",
    id: "Tempat apa yang menarik untuk dikunjungi di dekat saya?",
    ms: "Apakah tempat yang menarik untuk dilawati berhampiran saya?",
    hi: "मेरे पास घूमने लायक कौन-कौन सी जगहें हैं?",
  },

  {
    vi: "Gợi ý cho tôi một tuyến tham quan.",
    en: "Suggest a sightseeing route for me.",
    zh: "请为我推荐一条观光路线。",
    ja: "観光ルートをおすすめしてください。",
    ko: "관광 코스를 추천해 주세요.",
    fr: "Suggérez-moi un itinéraire touristique.",
    de: "Schlagen Sie mir eine Besichtigungsroute vor.",
    es: "Sugiereme una ruta turística.",
    it: "Suggeriscimi un itinerario turistico.",
    pt: "Sugira um roteiro turístico para mim.",
    ru: "Предложите мне туристический маршрут.",
    th: "แนะนำเส้นทางท่องเที่ยวให้ฉันหน่อย",
    id: "Sarankan rute wisata untuk saya.",
    ms: "Cadangkan laluan bersiar-siar untuk saya.",
    hi: "मेरे लिए एक पर्यटन मार्ग सुझाएँ।",
  },

  {
    vi: "Giới thiệu một địa điểm nổi tiếng.",
    en: "Tell me about a famous place.",
    zh: "请介绍一个著名的地方。",
    ja: "有名な観光地を紹介してください。",
    ko: "유명한 장소를 소개해 주세요.",
    fr: "Présentez-moi un lieu célèbre.",
    de: "Stellen Sie mir einen berühmten Ort vor.",
    es: "Háblame de un lugar famoso.",
    it: "Parlami di un luogo famoso.",
    pt: "Fale-me sobre um lugar famoso.",
    ru: "Расскажите мне об известном месте.",
    th: "แนะนำสถานที่ท่องเที่ยวที่มีชื่อเสียงให้ฉันหน่อย",
    id: "Ceritakan tentang tempat terkenal.",
    ms: "Ceritakan tentang tempat yang terkenal.",
    hi: "मुझे किसी प्रसिद्ध जगह के बारे में बताइए।",
  },

  {
    vi: "Tôi nên đi đâu nếu chỉ có 2 giờ?",
    en: "Where should I go if I only have 2 hours?",
    zh: "如果我只有两个小时，应该去哪里？",
    ja: "2時間しかない場合、どこに行けばいいですか？",
    ko: "2시간밖에 없다면 어디에 가야 하나요?",
    fr: "Où devrais-je aller si je n'ai que 2 heures ?",
    de: "Wohin sollte ich gehen, wenn ich nur 2 Stunden habe?",
    es: "¿A dónde debería ir si solo tengo 2 horas?",
    it: "Dove dovrei andare se ho solo 2 ore?",
    pt: "Onde devo ir se tiver apenas 2 horas?",
    ru: "Куда мне пойти, если у меня всего 2 часа?",
    th: "ฉันควรไปที่ไหนถ้ามีเวลาเพียง 2 ชั่วโมง?",
    id: "Ke mana saya harus pergi jika hanya punya waktu 2 jam?",
    ms: "Ke mana saya patut pergi jika saya hanya mempunyai 2 jam?",
    hi: "अगर मेरे पास केवल 2 घंटे हैं तो मुझे कहाँ जाना चाहिए?",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function getQuestion(question, language) {
  return (
    question?.[language] ||
    question?.vi ||
    question?.en ||
    ""
  );
}

function createMessageId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

/* =========================================================
   USER CHAT
========================================================= */

export default function UserChat() {
  const {
    language,
    t,
  } = useLanguage();

  const navigate = useNavigate();

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const [messages, setMessages] =
    useState([]);

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =======================================================
     INITIAL MESSAGE
  ======================================================= */

 useEffect(() => {
  const greetings = {
    vi: "Xin chào! Tôi là AI Tour Guide. Tôi có thể giúp bạn tìm địa điểm tham quan, giải thích thông tin về POI và gợi ý lịch trình.",

    en: "Hello! I am your AI Tour Guide. I can help you discover places, explain POIs, and suggest sightseeing routes.",

    zh: "你好！我是你的 AI 导游。我可以帮助你寻找旅游景点、介绍 POI 信息，并为你推荐旅游路线。",

    ja: "こんにちは！私はAIツアーガイドです。観光スポットの検索、POIの説明、観光ルートの提案をお手伝いします。",

    ko: "안녕하세요! 저는 AI 투어 가이드입니다. 관광지를 찾고, POI 정보를 설명하며, 관광 코스를 추천해 드릴 수 있습니다.",

    fr: "Bonjour ! Je suis votre guide touristique IA. Je peux vous aider à découvrir des lieux, à expliquer les informations sur les POI et à suggérer des itinéraires touristiques.",

    de: "Hallo! Ich bin Ihr KI-Reiseführer. Ich kann Ihnen helfen, Sehenswürdigkeiten zu entdecken, POI-Informationen zu erklären und Reiserouten vorzuschlagen.",

    es: "¡Hola! Soy tu guía turístico de IA. Puedo ayudarte a descubrir lugares, explicar información sobre los POI y sugerir rutas turísticas.",

    it: "Ciao! Sono la tua guida turistica AI. Posso aiutarti a scoprire luoghi, spiegare le informazioni sui POI e suggerire itinerari turistici.",

    pt: "Olá! Sou o seu guia turístico de IA. Posso ajudá-lo a descobrir lugares, explicar informações sobre POIs e sugerir roteiros turísticos.",

    ru: "Здравствуйте! Я ваш AI-гид. Я могу помочь вам найти интересные места, рассказать о POI и предложить туристические маршруты.",

    th: "สวัสดี! ฉันคือ AI Tour Guide ของคุณ ฉันสามารถช่วยค้นหาสถานที่ท่องเที่ยว อธิบายข้อมูล POI และแนะนำเส้นทางท่องเที่ยวให้คุณได้",

    id: "Halo! Saya adalah AI Tour Guide Anda. Saya dapat membantu Anda menemukan tempat wisata, menjelaskan informasi POI, dan menyarankan rute wisata.",

    ms: "Helo! Saya ialah AI Tour Guide anda. Saya boleh membantu anda mencari tempat menarik, menerangkan maklumat POI dan mencadangkan laluan pelancongan.",

    hi: "नमस्ते! मैं आपका AI टूर गाइड हूँ। मैं आपको पर्यटन स्थल खोजने, POI की जानकारी समझाने और यात्रा मार्ग सुझाने में मदद कर सकता हूँ।",
  };

  setMessages([
    {
      id: createMessageId(),
      role: "assistant",
      text:
        greetings[language] ||
        greetings.en,
      sources: [],
    },
  ]);
}, [language]);

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  /* =======================================================
     AUTO RESIZE TEXTAREA
  ======================================================= */

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      140
    )}px`;
  }, [input]);

  /* =======================================================
     SUGGESTED QUESTIONS
  ======================================================= */

  const suggestedQuestions = useMemo(
    () =>
      SUGGESTED_QUESTIONS.map(
        (item) =>
          getQuestion(
            item,
            language
          )
      ),
    [language]
  );

  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  async function sendMessage(
    questionOverride = ""
  ) {
    const question = (
      questionOverride ||
      input
    ).trim();

    if (!question || loading) {
      return;
    }

    const token = getUserToken();

    if (!token) {
      setError(
        language === "vi"
          ? "Bạn cần đăng nhập để sử dụng AI Agent."
          : "You need to log in to use the AI Agent."
      );

      return;
    }

    setError("");

    const userMessage = {
      id: createMessageId(),
      role: "user",
      text: question,
      sources: [],
    };

    setMessages(
      (current) => [
        ...current,
        userMessage,
      ]
    );

    setInput("");
    setLoading(true);

    try {
      const result =
        await chatWithAgent(
          token,
          question,
          language
        );

      const answer =
        result?.data?.answer ||
        result?.answer ||
        (
          language === "vi"
            ? "AI chưa có câu trả lời."
            : "The AI does not have an answer yet."
        );

      const sources =
        result?.data?.sources ||
        result?.sources ||
        [];

      const assistantMessage = {
        id: createMessageId(),
        role: "assistant",
        text: answer,
        sources: Array.isArray(
          sources
        )
          ? sources
          : [],
      };

      setMessages(
        (current) => [
          ...current,
          assistantMessage,
        ]
      );
    } catch (err) {
      console.error(
        "[UserChat]",
        err
      );

      const message =
        err?.message ||
        (
          language === "vi"
            ? "Không thể kết nối với AI."
            : "Unable to connect to the AI."
        );

      setError(message);

      setMessages(
        (current) => [
          ...current,
          {
            id: createMessageId(),
            role: "assistant",
            text: message,
            sources: [],
            isError: true,
          },
        ]
      );
    } finally {
      setLoading(false);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }

  /* =======================================================
     FORM SUBMIT
  ======================================================= */

  function handleSubmit(event) {
    event.preventDefault();

    sendMessage();
  }

  /* =======================================================
     ENTER / SHIFT + ENTER
  ======================================================= */

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  }

  /* =======================================================
     CLEAR CHAT
  ======================================================= */

  function clearChat() {
    setMessages([
      {
        id: createMessageId(),
        role: "assistant",
        text:
          language === "vi"
            ? "Đã bắt đầu cuộc trò chuyện mới. Tôi có thể giúp gì cho bạn?"
            : "A new conversation has started. How can I help you?",
        sources: [],
      },
    ]);

    setError("");
    setInput("");

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }

  /* =======================================================
     OPEN POI
  ======================================================= */

  function openPoi(source) {
    if (!source) return;

    const poiId =
      source.id ||
      source.poiId ||
      source.poi_id;

    if (!poiId) return;

    navigate(
      `/pois/${poiId}`
    );
  }

  /* =======================================================
     SOURCE TITLE
  ======================================================= */

  function getSourceTitle(source) {
    return (
      source.name ||
      source.title ||
      source.poiName ||
      source.poi_name ||
      (
        language === "vi"
          ? "Địa điểm"
          : "Place"
      )
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <UserLayout>
      <section className="mx-auto flex max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#e7ecef] sm:p-6">

          <div className="flex items-start justify-between gap-4">

            <div className="flex min-w-0 items-start gap-3">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf7ff] text-[#2196F3]">
                <Sparkles size={23} />
              </div>

              <div className="min-w-0">

                <p className="text-xs font-extrabold uppercase tracking-wider text-[#2196F3]">
                  AI TOUR GUIDE
                </p>

                <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
                  {t.chatTitle || "AI Tour Guide"}
                </h1>

                <p className="mt-2 text-sm leading-6 text-[#777]">
                  {t.chatText ||
                    (
                      language === "vi"
                        ? "Hỏi AI về địa điểm, POI và hành trình tham quan."
                        : "Ask AI about places, POIs and sightseeing routes."
                    )}
                </p>

              </div>
            </div>

            <button
              type="button"
              onClick={clearChat}
              title={
                language === "vi"
                  ? "Cuộc trò chuyện mới"
                  : "New conversation"
              }
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[#dfe7ea] px-3 text-sm font-bold text-[#666] transition hover:bg-[#f5f7fa]"
            >
              <span className="hidden sm:inline">
                {language === "vi"
                  ? "Cuộc trò chuyện mới"
                  : "New chat"}
              </span>

              <X size={17} />
            </button>

          </div>

        </div>

        {/* =================================================
            CHAT CONTAINER
        ================================================= */}

        <div className="mt-5 overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-[#e7ecef]">

          {/* CHAT MESSAGES */}

          <div className="min-h-[480px] max-h-[calc(100vh-360px)] overflow-y-auto p-4 sm:p-6">

            {/* EMPTY / SUGGESTIONS */}

            {messages.length <= 1 && (
              <div className="mx-auto mb-6 max-w-2xl">

                <div className="mb-4 text-center">

                  <p className="text-sm font-bold text-[#555]">
                    {language === "vi"
                      ? "Bạn có thể hỏi:"
                      : "You can ask:"}
                  </p>

                </div>

                <div className="grid gap-2 sm:grid-cols-2">

                  {suggestedQuestions.map(
                    (question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() =>
                          sendMessage(
                            question
                          )
                        }
                        disabled={loading}
                        className="rounded-2xl border border-[#e7ecef] bg-white p-4 text-left text-sm font-semibold text-[#444] transition hover:border-[#2196F3] hover:bg-[#f8fcff] disabled:opacity-50"
                      >
                        {question}
                      </button>
                    )
                  )}

                </div>

              </div>
            )}

            {/* MESSAGES */}

            <div className="mx-auto max-w-4xl space-y-5">

              {messages.map(
                (message) => {
                  const isUser =
                    message.role ===
                    "user";

                  return (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${
                        isUser
                          ? "flex-row-reverse"
                          : ""
                      }`}
                    >

                      {/* AVATAR */}

                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          isUser
                            ? "bg-[#2196F3] text-white"
                            : "bg-[#eaf7ff] text-[#2196F3]"
                        }`}
                      >
                        {isUser ? (
                          <UserRound
                            size={18}
                          />
                        ) : (
                          <Bot
                            size={18}
                          />
                        )}
                      </div>

                      {/* MESSAGE */}

                      <div
                        className={`min-w-0 max-w-[85%] sm:max-w-[75%] ${
                          isUser
                            ? "items-end"
                            : "items-start"
                        }`}
                      >

                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                            isUser
                              ? "rounded-tr-md bg-[#2196F3] text-white"
                              : message.isError
                              ? "rounded-tl-md border border-red-200 bg-red-50 text-red-700"
                              : "rounded-tl-md bg-[#f5f7fa] text-[#333]"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">
                            {message.text}
                          </div>
                        </div>

                        {/* SOURCES */}

                        {!isUser &&
                          message.sources
                            ?.length >
                            0 && (
                            <div className="mt-2 space-y-2">

                              <p className="px-1 text-xs font-bold text-[#888]">
                                {language ===
                                "vi"
                                  ? "Địa điểm liên quan"
                                  : "Related places"}
                              </p>

                              {message.sources.map(
                                (
                                  source,
                                  index
                                ) => {
                                  const sourceId =
                                    source.id ||
                                    source.poiId ||
                                    source.poi_id;

                                  return (
                                    <button
                                      key={
                                        sourceId ||
                                        index
                                      }
                                      type="button"
                                      onClick={() =>
                                        openPoi(
                                          source
                                        )
                                      }
                                      disabled={
                                        !sourceId
                                      }
                                      className="flex w-full items-center gap-3 rounded-xl border border-[#e7ecef] bg-white p-3 text-left transition hover:border-[#2196F3] hover:bg-[#f8fcff] disabled:cursor-default"
                                    >

                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eaf7ff] text-[#2196F3]">
                                        <MapPin
                                          size={
                                            17
                                          }
                                        />
                                      </div>

                                      <div className="min-w-0 flex-1">

                                        <p className="truncate text-sm font-extrabold text-[#333]">
                                          {getSourceTitle(
                                            source
                                          )}
                                        </p>

                                        {source.distance !=
                                          null && (
                                          <p className="mt-0.5 text-xs text-[#888]">
                                            {source.distance}
                                          </p>
                                        )}

                                      </div>

                                      {sourceId && (
                                        <ExternalLink
                                          size={
                                            16
                                          }
                                          className="shrink-0 text-[#999]"
                                        />
                                      )}

                                    </button>
                                  );
                                }
                              )}

                            </div>
                          )}

                      </div>

                    </div>
                  );
                }
              )}

              {/* =================================================
                  TYPING INDICATOR
              ================================================= */}

              {loading && (
                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf7ff] text-[#2196F3]">
                    <Bot size={18} />
                  </div>

                  <div className="rounded-2xl rounded-tl-md bg-[#f5f7fa] px-4 py-3">

                    <div className="flex items-center gap-1.5">

                      <span className="h-2 w-2 animate-bounce rounded-full bg-[#999]" />

                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-[#999]"
                        style={{
                          animationDelay:
                            "120ms",
                        }}
                      />

                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-[#999]"
                        style={{
                          animationDelay:
                            "240ms",
                        }}
                      />

                    </div>

                  </div>

                </div>
              )}

              <div
                ref={messagesEndRef}
              />

            </div>

          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="border-t border-red-100 bg-red-50 px-4 py-3 sm:px-6">

              <p className="mx-auto max-w-4xl text-sm font-semibold text-red-600">
                {error}
              </p>

            </div>
          )}

          {/* =================================================
              INPUT
          ================================================= */}

          <div className="border-t border-[#e7ecef] bg-white p-3 sm:p-4">

            <form
              onSubmit={handleSubmit}
              className="mx-auto max-w-4xl"
            >

              <div className="flex items-end gap-2 rounded-2xl border border-[#dfe7ea] bg-[#fafcfd] p-2 transition focus-within:border-[#2196F3] focus-within:ring-2 focus-within:ring-[#2196F3]/10">

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) =>
                    setInput(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  disabled={loading}
                  rows={1}
                  maxLength={2000}
                  placeholder={
                    language === "vi"
                      ? "Hỏi AI về địa điểm hoặc hành trình..."
                      : "Ask AI about places or routes..."
                  }
                  className="max-h-[140px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-6 text-[#333] outline-none placeholder:text-[#aaa] disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !input.trim()
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2196F3] text-white transition hover:bg-[#1976D2] disabled:cursor-not-allowed disabled:opacity-40"
                  title={
                    language === "vi"
                      ? "Gửi"
                      : "Send"
                  }
                >
                  <Send size={18} />
                </button>

              </div>

              <div className="mt-2 flex items-center justify-between px-1">

                <p className="text-[11px] text-[#999]">
                  {language === "vi"
                    ? "Enter để gửi · Shift + Enter để xuống dòng"
                    : "Enter to send · Shift + Enter for new line"}
                </p>

                <p className="text-[11px] text-[#aaa]">
                  {input.length}/2000
                </p>

              </div>

            </form>

          </div>

        </div>

      </section>
    </UserLayout>
  );
}