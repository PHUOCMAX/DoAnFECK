import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  MessageCircle,
  Send,
  X,
  Bot,
  User,
} from "lucide-react";

import { chatWithAgent } from "../services/agentService";

export default function AIChatbot({
  language = "vi",
}) {
  const [open, setOpen] =
    useState(false);

  const [question, setQuestion] =
    useState("");

  const [messages, setMessages] =
    useState([
      {
        id: 1,
        role: "assistant",
        content:
          "Xin chào! Tôi là trợ lý du lịch. Bạn muốn tìm hiểu địa điểm nào?",
      },
    ]);

  const [loading, setLoading] =
    useState(false);

  const messagesEndRef =
    useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function handleSend() {
    const text =
      question.trim();

    if (!text || loading) {
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content:
            "Bạn cần đăng nhập để sử dụng trợ lý AI.",
        },
      ]);

      return;
    }

    setQuestion("");

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        content: text,
      },
    ]);

    setLoading(true);

    try {
      const result =
        await chatWithAgent(
          token,
          text,
          language
        );

      const answer =
        result?.data?.answer ||
        "AI chưa có câu trả lời.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: answer,
          sources:
            result?.data?.sources || [],
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content:
            error?.message ||
            "Không thể kết nối với AI.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() =>
            setOpen(true)
          }
          className="
            fixed
            bottom-6
            right-6
            z-50
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-full
            bg-sky-500
            text-white
            shadow-lg
            transition
            hover:bg-sky-600
          "
          aria-label="Mở trợ lý AI"
        >
          <MessageCircle
            size={26}
          />
        </button>
      )}

      {open && (
        <div
          className="
            fixed
            bottom-6
            right-6
            z-50
            flex
            h-[600px]
            w-[380px]
            max-w-[calc(100vw-32px)]
            flex-col
            overflow-hidden
            rounded-2xl
            border
            border-slate-200
            bg-white
            shadow-2xl
          "
        >
          {/* Header */}
          <div
            className="
              flex
              items-center
              justify-between
              bg-sky-500
              px-4
              py-3
              text-white
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  bg-white/20
                "
              >
                <Bot size={20} />
              </div>

              <div>
                <p className="font-semibold">
                  AI Tour Guide
                </p>

                <p className="text-xs text-sky-100">
                  Trợ lý du lịch
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              className="
                rounded-lg
                p-2
                transition
                hover:bg-white/10
              "
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div
            className="
              flex-1
              space-y-4
              overflow-y-auto
              bg-slate-50
              p-4
            "
          >
            {messages.map(
              (message) => {
                const isUser =
                  message.role ===
                  "user";

                return (
                  <div
                    key={message.id}
                    className={`
                      flex
                      gap-2
                      ${
                        isUser
                          ? "justify-end"
                          : "justify-start"
                      }
                    `}
                  >
                    {!isUser && (
                      <div
                        className="
                          mt-1
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          bg-sky-100
                          text-sky-600
                        "
                      >
                        <Bot
                          size={16}
                        />
                      </div>
                    )}

                    <div
                      className={`
                        max-w-[78%]
                        rounded-2xl
                        px-3
                        py-2.5
                        text-sm
                        leading-relaxed
                        ${
                          isUser
                            ? "rounded-br-md bg-sky-500 text-white"
                            : "rounded-bl-md bg-white text-slate-700 shadow-sm"
                        }
                      `}
                    >
                      {message.content}

                      {message.sources
                        ?.length >
                        0 && (
                        <div
                          className="
                            mt-3
                            border-t
                            border-slate-200
                            pt-2
                          "
                        >
                          <p className="mb-1 text-xs font-semibold text-slate-500">
                            Địa điểm liên quan
                          </p>

                          {message.sources.map(
                            (source) => (
                              <div
                                key={
                                  source.id
                                }
                                className="
                                  text-xs
                                  text-slate-600
                                "
                              >
                                {source.name}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div
                        className="
                          mt-1
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          bg-sky-100
                          text-sky-600
                        "
                      >
                        <User
                          size={16}
                        />
                      </div>
                    )}
                  </div>
                );
              }
            )}

            {loading && (
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <div
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    bg-sky-100
                    text-sky-600
                  "
                >
                  <Bot size={16} />
                </div>

                <div
                  className="
                    rounded-2xl
                    rounded-bl-md
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-slate-500
                    shadow-sm
                  "
                >
                  AI đang suy nghĩ...
                </div>
              </div>
            )}

            <div
              ref={messagesEndRef}
            />
          </div>

          {/* Input */}
          <div
            className="
              border-t
              border-slate-200
              bg-white
              p-3
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                px-3
                py-2
                focus-within:border-sky-400
              "
            >
              <input
                type="text"
                value={question}
                onChange={(event) =>
                  setQuestion(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="Hỏi về địa điểm..."
                disabled={loading}
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  text-sm
                  text-slate-700
                  outline-none
                  placeholder:text-slate-400
                "
              />

              <button
                type="button"
                onClick={
                  handleSend
                }
                disabled={
                  loading ||
                  !question.trim()
                }
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-sky-500
                  text-white
                  transition
                  hover:bg-sky-600
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <Send size={17} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}