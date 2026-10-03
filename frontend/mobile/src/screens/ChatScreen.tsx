import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppStore } from "../store/useAppStore";
import { getTranslations } from "../translations";
import { chatWithAgent } from "../services/api";
import { speakText, stopSpeaking } from "../services/nativeTts";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const SUGGESTIONS = {
  vi: [
    "Gợi ý địa điểm du lịch gần tôi",
    "Có địa điểm ăn uống nào gần đây?",
    "Giới thiệu cho tôi một địa điểm nổi tiếng",
    "Tôi nên đi đâu ở TP. Hồ Chí Minh?",
  ],
  en: [
    "Suggest tourist attractions near me",
    "Are there any restaurants nearby?",
    "Tell me about a famous place",
    "Where should I go in Ho Chi Minh City?",
  ],
  zh: [
    "推荐附近的旅游景点",
    "附近有什么餐厅？",
    "介绍一个著名的景点",
    "在胡志明市我应该去哪里？",
  ],
  ja: [
    "近くの観光スポットを教えて",
    "近くにレストランはありますか？",
    "有名な観光地を紹介して",
    "ホーチミン市ではどこに行くべきですか？",
  ],
  ko: [
    "근처 관광지를 추천해 주세요",
    "근처에 식당이 있나요?",
    "유명한 관광지를 소개해 주세요",
    "호치민시에서 어디에 가야 하나요?",
  ],
  fr: [
    "Suggérez-moi des lieux touristiques près de moi",
    "Y a-t-il des restaurants à proximité ?",
    "Présentez-moi un lieu célèbre",
    "Où aller à Hô Chi Minh-Ville ?",
  ],
  de: [
    "Empfehlen Sie Sehenswürdigkeiten in meiner Nähe",
    "Gibt es Restaurants in der Nähe?",
    "Stellen Sie mir einen berühmten Ort vor",
    "Wohin sollte ich in Ho-Chi-Minh-Stadt gehen?",
  ],
  es: [
    "Recomiéndame lugares turísticos cerca de mí",
    "¿Hay restaurantes cerca?",
    "Háblame de un lugar famoso",
    "¿Dónde debería ir en Ciudad Ho Chi Minh?",
  ],
  it: [
    "Consigliami luoghi turistici vicino a me",
    "Ci sono ristoranti nelle vicinanze?",
    "Parlami di un luogo famoso",
    "Dove dovrei andare a Ho Chi Minh?",
  ],
  pt: [
    "Recomende atrações turísticas perto de mim",
    "Há restaurantes por perto?",
    "Fale-me sobre um lugar famoso",
    "Onde devo ir na Cidade de Ho Chi Minh?",
  ],
  ru: [
    "Посоветуйте достопримечательности рядом со мной",
    "Есть ли поблизости рестораны?",
    "Расскажите об известном месте",
    "Куда стоит сходить в Хошимине?",
  ],
  th: [
    "แนะนำสถานที่ท่องเที่ยวใกล้ฉัน",
    "มีร้านอาหารใกล้ๆ ไหม?",
    "แนะนำสถานที่ที่มีชื่อเสียงให้ฉัน",
    "ฉันควรไปที่ไหนในโฮจิมินห์?",
  ],
  id: [
    "Rekomendasikan tempat wisata di dekat saya",
    "Apakah ada restoran di dekat sini?",
    "Ceritakan tentang tempat terkenal",
    "Ke mana saya harus pergi di Ho Chi Minh City?",
  ],
  ms: [
    "Cadangkan tempat pelancongan berdekatan saya",
    "Adakah terdapat restoran berdekatan?",
    "Ceritakan tentang tempat terkenal",
    "Ke mana saya patut pergi di Ho Chi Minh City?",
  ],
  hi: [
    "मेरे पास पर्यटन स्थलों का सुझाव दें",
    "क्या पास में कोई रेस्तरां है?",
    "मुझे किसी प्रसिद्ध स्थान के बारे में बताएं",
    "हो ची मिन्ह सिटी में मुझे कहाँ जाना चाहिए?",
  ],
} as const;

const WELCOME = {
  vi: "Xin chào! Tôi có thể giúp bạn tìm địa điểm du lịch, ăn uống và cung cấp thông tin về các POI.",
  en: "Hello! I can help you find tourist attractions, restaurants, and information about nearby POIs.",
  zh: "你好！我可以帮助你寻找旅游景点、餐厅，并提供附近地点的信息。",
  ja: "こんにちは！観光スポットやレストランを探したり、近くの場所について情報を提供できます。",
  ko: "안녕하세요! 관광지와 레스토랑을 찾고 주변 장소에 대한 정보를 제공해 드릴 수 있습니다.",
  fr: "Bonjour ! Je peux vous aider à trouver des sites touristiques, des restaurants et des informations sur les lieux à proximité.",
  de: "Hallo! Ich kann Ihnen helfen, Sehenswürdigkeiten und Restaurants zu finden und Informationen über Orte in der Nähe bereitzustellen.",
  es: "¡Hola! Puedo ayudarte a encontrar lugares turísticos, restaurantes y obtener información sobre lugares cercanos.",
  it: "Ciao! Posso aiutarti a trovare attrazioni turistiche, ristoranti e informazioni sui luoghi vicini.",
  pt: "Olá! Posso ajudar você a encontrar atrações turísticas, restaurantes e informações sobre locais próximos.",
  ru: "Здравствуйте! Я могу помочь найти достопримечательности, рестораны и информацию о nearby местах.",
  th: "สวัสดี! ฉันสามารถช่วยคุณค้นหาสถานที่ท่องเที่ยว ร้านอาหาร และข้อมูลเกี่ยวกับสถานที่ใกล้เคียงได้",
  id: "Halo! Saya dapat membantu menemukan tempat wisata, restoran, dan memberikan informasi tentang tempat di sekitar Anda.",
  ms: "Helo! Saya boleh membantu mencari tempat pelancongan, restoran dan memberikan maklumat tentang tempat berdekatan.",
  hi: "नमस्ते! मैं पर्यटन स्थलों, रेस्तरां और आसपास के स्थानों के बारे में जानकारी खोजने में आपकी मदद कर सकता हूँ।",
} as const;

export default function ChatScreen() {
  const language = useAppStore(
    (state) => state.language
  );

  const token = useAppStore(
    (state) => state.token
  );

  const texts = getTranslations(language);
  const common = texts.common;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const listRef = useRef<FlatList<Message>>(null);

  const suggestions =
    SUGGESTIONS[language] ?? SUGGESTIONS.vi;

  useEffect(() => {
    stopSpeaking();

    setMessages([
      {
        id: `welcome-${language}`,
        role: "assistant",
        text: WELCOME[language] ?? WELCOME.vi,
      },
    ]);

    setInput("");
  }, [language]);

  useEffect(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({
        animated: true,
      });
    }, 80);
  }, [messages]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const sendMessage = async (text?: string) => {
    const question = (text ?? input).trim();

    if (!question || loading) return;

    if (!token) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          text:
            common.loginRequired ??
            "Vui lòng đăng nhập để sử dụng AI Chat.",
        },
      ]);

      return;
    }

    setInput("");

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      text: question,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setLoading(true);

    try {
      const response = await chatWithAgent(
        question,
        language,
        token
      );

      const answer =
        response.data.answer?.trim() ||
        "Không nhận được câu trả lời từ AI.";

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: answer,
        },
      ]);

      
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể kết nối với AI.";

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          text: message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    stopSpeaking();

    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        text: WELCOME[language] ?? WELCOME.vi,
      },
    ]);

    setInput("");
  };

  const renderMessage = ({
    item,
  }: {
    item: Message;
  }) => {
    const isUser = item.role === "user";

    return (
      <View
        style={[
          styles.messageRow,
          isUser
            ? styles.userRow
            : styles.assistantRow,
        ]}
      >
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>
              AI
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isUser
              ? styles.userBubble
              : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser
                ? styles.userMessageText
                : styles.assistantMessageText,
            ]}
          >
            {item.text}
          </Text>

          {!isUser && (
            <Pressable
              style={styles.speakButton}
              onPress={() =>
                speakText(item.text, language)
              }
            >
              <Text style={styles.speakButtonText}>
                🔊
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              AI
            </Text>
          </View>

          <View>
            <Text style={styles.headerTitle}>
              AI Guide
            </Text>

            <Text style={styles.headerSubtitle}>
              Multilingual Tour Guide
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.clearButton}
          onPress={clearChat}
        >
          <Text style={styles.clearButtonText}>
            ↻
          </Text>
        </Pressable>
      </View>

      {/* MESSAGES */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.messagesContent}
        ListFooterComponent={
          loading ? (
            <View style={styles.typingRow}>
              <View style={styles.aiAvatar}>
                <Text style={styles.aiAvatarText}>
                  AI
                </Text>
              </View>

              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" />

                <Text style={styles.typingText}>
                  AI đang trả lời...
                </Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* SUGGESTIONS */}
      {!loading && input.length === 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>
            {common.suggestions ?? "Gợi ý"}
          </Text>

          <FlatList
            horizontal
            data={suggestions}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.suggestionsList
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.suggestion}
                onPress={() =>
                  sendMessage(item)
                }
              >
                <Text
                  style={styles.suggestionText}
                  numberOfLines={2}
                >
                  {item}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {/* INPUT */}
      <View style={styles.inputArea}>
        <View style={styles.inputContainer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={
              common.chatPlaceholder ??
              "Hỏi AI Guide..."
            }
            placeholderTextColor="#999"
            multiline
            maxLength={2000}
            editable={!loading}
            style={styles.input}
            textAlignVertical="top"
          />

          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || loading) &&
                styles.sendButtonDisabled,
              pressed && styles.buttonPressed,
            ]}
            disabled={!input.trim() || loading}
            onPress={() => sendMessage()}
          >
            <Text style={styles.sendButtonText}>
              ➤
            </Text>
          </Pressable>
        </View>

        <Text style={styles.languageHint}>
          {language.toUpperCase()} • AI Guide
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },

  /* HEADER */

  header: {
    height: 72,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e8ebee",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#168dcc",
    alignItems: "center",
    justifyContent: "center",
  },

  headerAvatarText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 13,
  },

  headerTitle: {
    marginLeft: 11,
    fontSize: 17,
    fontWeight: "900",
    color: "#171717",
  },

  headerSubtitle: {
    marginLeft: 11,
    marginTop: 2,
    fontSize: 11,
    color: "#7b8188",
  },

  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f1f3f5",
    alignItems: "center",
    justifyContent: "center",
  },

  clearButtonText: {
    fontSize: 23,
    color: "#555",
  },

  /* MESSAGES */

  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,
  },

  messageRow: {
    flexDirection: "row",
    marginBottom: 13,
    maxWidth: "92%",
  },

  assistantRow: {
    alignSelf: "flex-start",
  },

  userRow: {
    alignSelf: "flex-end",
  },

  aiAvatar: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#168dcc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  aiAvatarText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },

  messageBubble: {
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 11,
    maxWidth: "84%",
  },

  assistantBubble: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e7eaed",
    borderTopLeftRadius: 5,
  },

  userBubble: {
    backgroundColor: "#168dcc",
    borderTopRightRadius: 5,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },

  assistantMessageText: {
    color: "#292929",
  },

  userMessageText: {
    color: "#ffffff",
  },

  speakButton: {
    marginTop: 8,
    alignSelf: "flex-end",
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#f1f4f6",
    alignItems: "center",
    justifyContent: "center",
  },

  speakButtonText: {
    fontSize: 15,
  },

  /* TYPING */

  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  typingBubble: {
    height: 40,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e7eaed",
  },

  typingText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#777",
  },

  /* SUGGESTIONS */

  suggestionsContainer: {
    backgroundColor: "#ffffff",
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#e8ebee",
  },

  suggestionsTitle: {
    paddingHorizontal: 14,
    marginBottom: 7,
    fontSize: 13,
    fontWeight: "800",
    color: "#555",
  },

  suggestionsList: {
    paddingHorizontal: 14,
  },

  suggestion: {
    width: 190,
    minHeight: 48,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 13,
    backgroundColor: "#edf7fc",
    borderWidth: 1,
    borderColor: "#d9edf7",
    justifyContent: "center",
  },

  suggestionText: {
    fontSize: 12,
    lineHeight: 17,
    color: "#17678e",
    fontWeight: "600",
  },

  /* INPUT */

  inputArea: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom:
      Platform.OS === "ios" ? 10 : 8,
    borderTopWidth: 1,
    borderTopColor: "#e8ebee",
  },

  inputContainer: {
    minHeight: 50,
    maxHeight: 120,
    borderRadius: 17,
    backgroundColor: "#f3f5f7",
    borderWidth: 1,
    borderColor: "#e3e7ea",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: 13,
    paddingRight: 6,
    paddingVertical: 5,
  },

  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    paddingTop: 9,
    paddingBottom: 8,
    paddingHorizontal: 2,
    color: "#222",
    fontSize: 15,
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#168dcc",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },

  sendButtonDisabled: {
    backgroundColor: "#cbd1d6",
  },

  sendButtonText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },

  languageHint: {
    marginTop: 5,
    marginLeft: 4,
    fontSize: 10,
    color: "#999",
  },

  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});