import { useEffect, useState } from "react";

export const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "th", label: "ไทย" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "hi", label: "हिन्दी" },
];

const DICT = {
  vi: {
    home: "Trang chủ",
    explore: "Khám phá",
    map: "Bản đồ",
    chat: "AI Agent",
    profile: "Tài khoản",

    logout: "Đăng xuất",
    welcome: "Chào mừng bạn",
    discover: "KHÁM PHÁ",
    intro:
      "Tìm địa điểm, xem thông tin và nghe thuyết minh bằng ngôn ngữ của bạn.",

    openMap: "Mở bản đồ",
    askAI: "Hỏi AI",
    searchPlace: "Tìm địa điểm...",
    nearby: "Địa điểm gần bạn",
    seeAll: "Xem tất cả →",
    detail: "Chi tiết",
    listen: "Nghe",
    tourism: "Du lịch",
    food: "Ẩm thực",

    mapFeature: "Bản đồ & vị trí",
    mapFeatureText:
      "Theo dõi vị trí và khám phá các POI trên bản đồ.",
    narration: "Thuyết minh",
    narrationText:
      "Nghe nội dung POI bằng TTS theo ngôn ngữ đã chọn.",
    aiFeature: "AI Agent",
    aiFeatureText:
      "Hỏi về những địa điểm và kiến thức có trong ứng dụng.",

    exploreTitle: "Khám phá địa điểm",
    exploreText:
      "Danh sách POI được chia sẻ với Mobile qua Backend.",
    all: "Tất cả",
    places: "địa điểm",
    noResults: "Không tìm thấy địa điểm phù hợp.",

    poiDetail: "Chi tiết địa điểm",
    back: "Quay lại",
    narrationTitle: "Thuyết minh",
    stop: "Dừng đọc",
    listenNarration: "Nghe thuyết minh",
    viewMap: "Xem trên bản đồ",
    latitude: "Vĩ độ",
    longitude: "Kinh độ",
    radius: "Bán kính",
    cityHcm: "Hồ Chí Minh",

    mapTitle: "Bản đồ địa điểm",
    mapText:
      "Bản đồ thực với vị trí hiện tại của bạn và các POI từ Backend.",
    myLocation: "Vị trí của tôi",
    locating: "Đang xác định vị trí...",
    locationDenied:
      "Không thể lấy vị trí. Hãy cho phép trình duyệt truy cập vị trí.",
    currentLocation: "Vị trí hiện tại",
    poiCount: "POI",
    selectPoi: "Chọn POI",
    openOSM: "Mở OpenStreetMap",
    suggestRoute: "Gợi ý tuyến",
recommendedRoute: "Tuyến tham quan đề xuất",
selectRoutePoiCount: "Chọn số lượng điểm muốn ghé.",
next: "Tiếp theo",
estimatedTotalDistance: "Tổng khoảng cách ước tính:",
openDirections: "Mở chỉ đường",
closeRoute: "Đóng tuyến",
    chatTitle: "AI Agent",
    chatText: "Hỏi về POI và kiến thức của ứng dụng.",
    send: "Gửi",
    chatPlaceholder: "Ví dụ: Địa điểm này có gì đặc biệt?",
    aiNotReady:
      "AI Backend/RAG chưa được kết nối ở Phase này. Giao diện đã sẵn sàng để nối vào Knowledge Base dùng chung cho Mobile và Web.",

    profileTitle: "Tài khoản",
    addPoi: "Thêm POI",
    addPoiTitle: "Đề xuất thêm địa điểm",
    addPoiText:
      "Thông tin sẽ được gửi lên Backend và chờ Admin duyệt.",
    nameVi: "Tên tiếng Việt",
    nameEn: "Tên tiếng Anh",
    nameZh: "Tên tiếng Trung",
    descVi: "Mô tả tiếng Việt",
    descEn: "Mô tả tiếng Anh",
    descZh: "Mô tả tiếng Trung",
    category: "Danh mục",
    location: "Vị trí",
    useMyLocation: "Dùng vị trí hiện tại",
    submitPoi: "Gửi POI",
    submitting: "Đang gửi...",
    poiSubmitted: "Đã gửi POI. Vui lòng chờ Admin duyệt.",
    required: "Vui lòng nhập đầy đủ thông tin.",

    loading: "Đang tải...",
    user: "User",
    role: "Vai trò",
  },

  en: {
    home: "Home",
    explore: "Explore",
    map: "Map",
    chat: "AI Agent",
    profile: "Account",

    logout: "Log out",
    welcome: "Welcome",
    discover: "DISCOVER",
    intro:
      "Find places, view information, and listen to narration in your language.",

    openMap: "Open map",
    askAI: "Ask AI",
    searchPlace: "Search places...",
    nearby: "Places near you",
    seeAll: "See all →",
    detail: "Details",
    listen: "Listen",
    tourism: "Tourism",
    food: "Food",

    mapFeature: "Map & location",
    mapFeatureText:
      "Track your location and explore POIs on the map.",
    narration: "Narration",
    narrationText:
      "Listen to POI content with TTS in your selected language.",
    aiFeature: "AI Agent",
    aiFeatureText:
      "Ask about places and knowledge available in the app.",

    exploreTitle: "Explore places",
    exploreText:
      "POIs shared with Mobile through the Backend.",
    all: "All",
    places: "places",
    noResults: "No matching places found.",

    poiDetail: "Place details",
    back: "Back",
    narrationTitle: "Narration",
    stop: "Stop",
    listenNarration: "Listen to narration",
    viewMap: "View on map",
    latitude: "Latitude",
    longitude: "Longitude",
    radius: "Radius",
    cityHcm: "Ho Chi Minh City",

    mapTitle: "Place map",
    mapText:
      "Real map with your current location and POIs from the Backend.",
    myLocation: "My location",
    locating: "Getting your location...",
    locationDenied:
      "Unable to get your location. Allow the browser to access location.",
    currentLocation: "Current location",
    poiCount: "POIs",
    selectPoi: "Select POI",
    openOSM: "Open OpenStreetMap",
    suggestRoute: "Suggest Route",
recommendedRoute: "Recommended Tour Route",
selectRoutePoiCount: "Choose how many places you want to visit.",
next: "Next",
estimatedTotalDistance: "Estimated total distance:",
openDirections: "Open Directions",
closeRoute: "Close Route",
    chatTitle: "AI Agent",
    chatText: "Ask about POIs and app knowledge.",
    send: "Send",
    chatPlaceholder:
      "Example: What is special about this place?",
    aiNotReady:
      "AI Backend/RAG is not connected in this phase. The UI is ready for the shared Mobile/Web Knowledge Base.",

    profileTitle: "Account",
    addPoi: "Add POI",
    addPoiTitle: "Suggest a place",
    addPoiText:
      "Your information will be sent to the Backend and reviewed by Admin.",
    nameVi: "Vietnamese name",
    nameEn: "English name",
    nameZh: "Chinese name",
    descVi: "Vietnamese description",
    descEn: "English description",
    descZh: "Chinese description",
    category: "Category",
    location: "Location",
    useMyLocation: "Use my location",
    submitPoi: "Submit POI",
    submitting: "Submitting...",
    poiSubmitted:
      "POI submitted. Please wait for Admin review.",
    required: "Please fill in all required information.",

    loading: "Loading...",
    user: "User",
    role: "Role",
  },

  zh: {
    home: "首页",
    explore: "探索",
    map: "地图",
    chat: "AI 助手",
    profile: "账户",

    logout: "退出登录",
    welcome: "欢迎",
    discover: "探索",
    intro:
      "查找地点、查看信息，并使用您的语言收听讲解。",

    openMap: "打开地图",
    askAI: "询问 AI",
    searchPlace: "搜索地点...",
    nearby: "附近地点",
    seeAll: "查看全部 →",
    detail: "详情",
    listen: "播放",
    tourism: "旅游",
    food: "美食",

    mapFeature: "地图与位置",
    mapFeatureText:
      "查看您的位置并探索地图上的 POI。",
    narration: "讲解",
    narrationText:
      "使用所选语言通过 TTS 收听 POI 内容。",
    aiFeature: "AI 助手",
    aiFeatureText:
      "询问应用中的地点和知识。",

    exploreTitle: "探索地点",
    exploreText:
      "通过 Backend 与 Mobile 共享的 POI。",
    all: "全部",
    places: "个地点",
    noResults: "没有找到匹配的地点。",

    poiDetail: "地点详情",
    back: "返回",
    narrationTitle: "讲解",
    stop: "停止",
    listenNarration: "收听讲解",
    viewMap: "在地图上查看",
    latitude: "纬度",
    longitude: "经度",
    radius: "半径",
    cityHcm: "胡志明市",

    mapTitle: "地点地图",
    mapText:
      "显示您的真实位置以及 Backend 中的 POI。",
    myLocation: "我的位置",
    locating: "正在获取位置...",
    locationDenied:
      "无法获取位置，请允许浏览器访问您的位置。",
    currentLocation: "当前位置",
    poiCount: "个 POI",
    selectPoi: "选择 POI",
    openOSM: "打开 OpenStreetMap",
suggestRoute: "推荐路线",
recommendedRoute: "推荐游览路线",
selectRoutePoiCount: "选择您想参观的地点数量。",
next: "下一站",
estimatedTotalDistance: "预计总距离：",
openDirections: "打开导航",
closeRoute: "关闭路线",
    chatTitle: "AI 助手",
    chatText: "询问 POI 和应用知识。",
    send: "发送",
    chatPlaceholder:
      "例如：这个地方有什么特别之处？",
    aiNotReady:
      "当前阶段尚未连接 AI Backend/RAG。界面已准备好连接 Mobile 和 Web 共用的知识库。",

    profileTitle: "账户",
    addPoi: "添加 POI",
    addPoiTitle: "推荐地点",
    addPoiText:
      "信息将发送到 Backend，并等待 Admin 审核。",
    nameVi: "越南语名称",
    nameEn: "英语名称",
    nameZh: "中文名称",
    descVi: "越南语描述",
    descEn: "英语描述",
    descZh: "中文描述",
    category: "类别",
    location: "位置",
    useMyLocation: "使用我的位置",
    submitPoi: "提交 POI",
    submitting: "正在提交...",
    poiSubmitted:
      "POI 已提交，请等待 Admin 审核。",
    required: "请填写完整信息。",

    loading: "加载中...",
    user: "用户",
    role: "角色",
  },

  ja: {
    home: "ホーム",
    explore: "探索",
    map: "地図",
    chat: "AIエージェント",
    profile: "アカウント",

    logout: "ログアウト",
    welcome: "ようこそ",
    discover: "探索",
    intro:
      "場所を探し、情報を確認し、お好みの言語で案内を聞くことができます。",

    openMap: "地図を開く",
    askAI: "AIに質問",
    searchPlace: "場所を検索...",
    nearby: "近くの場所",
    seeAll: "すべて見る →",
    detail: "詳細",
    listen: "聞く",
    tourism: "観光",
    food: "グルメ",

    mapFeature: "地図と位置情報",
    mapFeatureText:
      "現在地を確認し、地図上のPOIを探索します。",
    narration: "音声案内",
    narrationText:
      "選択した言語でPOIの内容をTTSで聞くことができます。",
    aiFeature: "AIエージェント",
    aiFeatureText:
      "アプリに登録されている場所や情報について質問できます。",

    exploreTitle: "場所を探索",
    exploreText:
      "Backendを通じてMobileと共有されるPOIです。",
    all: "すべて",
    places: "場所",
    noResults: "該当する場所が見つかりません。",

    poiDetail: "場所の詳細",
    back: "戻る",
    narrationTitle: "音声案内",
    stop: "停止",
    listenNarration: "音声案内を聞く",
    viewMap: "地図で見る",
    latitude: "緯度",
    longitude: "経度",
    radius: "半径",
    cityHcm: "ホーチミン市",

    mapTitle: "場所の地図",
    mapText:
      "現在地とBackendから取得したPOIを表示します。",
    myLocation: "現在地",
    locating: "位置情報を取得中...",
    locationDenied:
      "位置情報を取得できません。ブラウザの位置情報へのアクセスを許可してください。",
    currentLocation: "現在位置",
    poiCount: "POI",
    selectPoi: "POIを選択",
    openOSM: "OpenStreetMapを開く",
suggestRoute: "ルートを提案",
recommendedRoute: "おすすめ観光ルート",
selectRoutePoiCount: "訪問したい場所の数を選択してください。",
next: "次へ",
estimatedTotalDistance: "推定総距離：",
openDirections: "ルート案内を開く",
closeRoute: "ルートを閉じる",
    chatTitle: "AIエージェント",
    chatText: "POIとアプリの知識について質問できます。",
    send: "送信",
    chatPlaceholder:
      "例：この場所の特徴は何ですか？",
    aiNotReady:
      "この段階ではAI Backend/RAGはまだ接続されていません。MobileとWebで共有するKnowledge Baseに接続できるUIを準備しています。",

    profileTitle: "アカウント",
    addPoi: "POIを追加",
    addPoiTitle: "場所を提案",
    addPoiText:
      "情報はBackendに送信され、Adminの承認を待ちます。",
    nameVi: "ベトナム語の名前",
    nameEn: "英語の名前",
    nameZh: "中国語の名前",
    descVi: "ベトナム語の説明",
    descEn: "英語の説明",
    descZh: "中国語の説明",
    category: "カテゴリー",
    location: "位置",
    useMyLocation: "現在地を使用",
    submitPoi: "POIを送信",
    submitting: "送信中...",
    poiSubmitted:
      "POIを送信しました。Adminの承認をお待ちください。",
    required: "必要な情報をすべて入力してください。",

    loading: "読み込み中...",
    user: "ユーザー",
    role: "役割",
  },

  ko: {
    home: "홈",
    explore: "탐색",
    map: "지도",
    chat: "AI 에이전트",
    profile: "계정",

    logout: "로그아웃",
    welcome: "환영합니다",
    discover: "탐색",
    intro:
      "장소를 찾고 정보를 확인하며 원하는 언어로 안내를 들을 수 있습니다.",

    openMap: "지도 열기",
    askAI: "AI에게 질문",
    searchPlace: "장소 검색...",
    nearby: "주변 장소",
    seeAll: "모두 보기 →",
    detail: "상세",
    listen: "듣기",
    tourism: "관광",
    food: "음식",

    mapFeature: "지도 및 위치",
    mapFeatureText:
      "현재 위치를 확인하고 지도에서 POI를 탐색합니다.",
    narration: "음성 안내",
    narrationText:
      "선택한 언어로 POI 콘텐츠를 TTS로 들을 수 있습니다.",
    aiFeature: "AI 에이전트",
    aiFeatureText:
      "앱에 등록된 장소와 정보에 대해 질문할 수 있습니다.",

    exploreTitle: "장소 탐색",
    exploreText:
      "Backend를 통해 Mobile과 공유되는 POI입니다.",
    all: "전체",
    places: "장소",
    noResults: "조건에 맞는 장소가 없습니다.",

    poiDetail: "장소 상세",
    back: "뒤로",
    narrationTitle: "음성 안내",
    stop: "중지",
    listenNarration: "음성 안내 듣기",
    viewMap: "지도에서 보기",
    latitude: "위도",
    longitude: "경도",
    radius: "반경",
    cityHcm: "호치민시",

    mapTitle: "장소 지도",
    mapText:
      "현재 위치와 Backend의 POI를 표시합니다.",
    myLocation: "내 위치",
    locating: "위치를 확인하는 중...",
    locationDenied:
      "위치를 가져올 수 없습니다. 브라우저의 위치 접근을 허용해주세요.",
    currentLocation: "현재 위치",
    poiCount: "POI",
    selectPoi: "POI 선택",
    openOSM: "OpenStreetMap 열기",
suggestRoute: "경로 추천",
recommendedRoute: "추천 관광 경로",
selectRoutePoiCount: "방문할 장소의 수를 선택하세요.",
next: "다음",
estimatedTotalDistance: "예상 총 거리:",
openDirections: "길찾기 열기",
closeRoute: "경로 닫기",
    chatTitle: "AI 에이전트",
    chatText: "POI와 앱 지식에 대해 질문하세요.",
    send: "보내기",
    chatPlaceholder:
      "예: 이 장소의 특별한 점은 무엇인가요?",
    aiNotReady:
      "현재 단계에서는 AI Backend/RAG가 연결되지 않았습니다. Mobile과 Web이 공유하는 Knowledge Base에 연결할 UI가 준비되어 있습니다.",

    profileTitle: "계정",
    addPoi: "POI 추가",
    addPoiTitle: "장소 제안",
    addPoiText:
      "정보가 Backend로 전송되며 Admin의 승인을 기다립니다.",
    nameVi: "베트남어 이름",
    nameEn: "영어 이름",
    nameZh: "중국어 이름",
    descVi: "베트남어 설명",
    descEn: "영어 설명",
    descZh: "중국어 설명",
    category: "카테고리",
    location: "위치",
    useMyLocation: "내 위치 사용",
    submitPoi: "POI 제출",
    submitting: "제출 중...",
    poiSubmitted:
      "POI가 제출되었습니다. Admin의 승인을 기다려주세요.",
    required: "필수 정보를 모두 입력해주세요.",

    loading: "로드 중...",
    user: "사용자",
    role: "역할",
  },

  fr: {
    home: "Accueil",
    explore: "Explorer",
    map: "Carte",
    chat: "Agent IA",
    profile: "Compte",

    logout: "Se déconnecter",
    welcome: "Bienvenue",
    discover: "DÉCOUVRIR",
    intro:
      "Trouvez des lieux, consultez les informations et écoutez les commentaires dans votre langue.",

    openMap: "Ouvrir la carte",
    askAI: "Demander à l'IA",
    searchPlace: "Rechercher un lieu...",
    nearby: "Lieux à proximité",
    seeAll: "Tout voir →",
    detail: "Détails",
    listen: "Écouter",
    tourism: "Tourisme",
    food: "Gastronomie",

    mapFeature: "Carte et localisation",
    mapFeatureText:
      "Suivez votre position et explorez les POI sur la carte.",
    narration: "Commentaire audio",
    narrationText:
      "Écoutez le contenu des POI avec la synthèse vocale dans la langue choisie.",
    aiFeature: "Agent IA",
    aiFeatureText:
      "Posez des questions sur les lieux et les connaissances disponibles dans l'application.",

    exploreTitle: "Explorer les lieux",
    exploreText:
      "POI partagés avec Mobile via le Backend.",
    all: "Tous",
    places: "lieux",
    noResults: "Aucun lieu correspondant trouvé.",

    poiDetail: "Détails du lieu",
    back: "Retour",
    narrationTitle: "Commentaire audio",
    stop: "Arrêter",
    listenNarration: "Écouter le commentaire",
    viewMap: "Voir sur la carte",
    latitude: "Latitude",
    longitude: "Longitude",
    radius: "Rayon",
    cityHcm: "Hô Chi Minh-Ville",

    mapTitle: "Carte des lieux",
    mapText:
      "Carte réelle avec votre position actuelle et les POI du Backend.",
    myLocation: "Ma position",
    locating: "Localisation en cours...",
    locationDenied:
      "Impossible d'obtenir votre position. Autorisez le navigateur à accéder à votre localisation.",
    currentLocation: "Position actuelle",
    poiCount: "POI",
    selectPoi: "Sélectionner un POI",
    openOSM: "Ouvrir OpenStreetMap",
suggestRoute: "Suggérer un itinéraire",
recommendedRoute: "Itinéraire touristique recommandé",
selectRoutePoiCount: "Choisissez le nombre de lieux à visiter.",
next: "Suivant",
estimatedTotalDistance: "Distance totale estimée :",
openDirections: "Ouvrir l'itinéraire",
closeRoute: "Fermer l'itinéraire",
    chatTitle: "Agent IA",
    chatText:
      "Posez des questions sur les POI et les connaissances de l'application.",
    send: "Envoyer",
    chatPlaceholder:
      "Exemple : Qu'est-ce qui est particulier dans cet endroit ?",
    aiNotReady:
      "Le Backend/RAG de l'IA n'est pas encore connecté à cette étape. L'interface est prête pour la Knowledge Base partagée entre Mobile et Web.",

    profileTitle: "Compte",
    addPoi: "Ajouter un POI",
    addPoiTitle: "Proposer un lieu",
    addPoiText:
      "Vos informations seront envoyées au Backend et examinées par l'Admin.",
    nameVi: "Nom vietnamien",
    nameEn: "Nom anglais",
    nameZh: "Nom chinois",
    descVi: "Description vietnamienne",
    descEn: "Description anglaise",
    descZh: "Description chinoise",
    category: "Catégorie",
    location: "Localisation",
    useMyLocation: "Utiliser ma position",
    submitPoi: "Envoyer le POI",
    submitting: "Envoi...",
    poiSubmitted:
      "POI envoyé. Veuillez attendre la validation de l'Admin.",
    required:
      "Veuillez remplir toutes les informations obligatoires.",

    loading: "Chargement...",
    user: "Utilisateur",
    role: "Rôle",
  },

  de: {
    home: "Startseite",
    explore: "Entdecken",
    map: "Karte",
    chat: "KI-Agent",
    profile: "Konto",

    logout: "Abmelden",
    welcome: "Willkommen",
    discover: "ENTDECKEN",
    intro:
      "Finden Sie Orte, sehen Sie Informationen und hören Sie Führungen in Ihrer Sprache.",

    openMap: "Karte öffnen",
    askAI: "KI fragen",
    searchPlace: "Ort suchen...",
    nearby: "Orte in Ihrer Nähe",
    seeAll: "Alle anzeigen →",
    detail: "Details",
    listen: "Anhören",
    tourism: "Tourismus",
    food: "Essen",

    mapFeature: "Karte & Standort",
    mapFeatureText:
      "Verfolgen Sie Ihren Standort und entdecken Sie POIs auf der Karte.",
    narration: "Audioguide",
    narrationText:
      "Hören Sie POI-Inhalte mit TTS in der ausgewählten Sprache.",
    aiFeature: "KI-Agent",
    aiFeatureText:
      "Fragen Sie nach Orten und Wissen, das in der App verfügbar ist.",

    exploreTitle: "Orte entdecken",
    exploreText:
      "POIs, die über das Backend mit Mobile geteilt werden.",
    all: "Alle",
    places: "Orte",
    noResults: "Keine passenden Orte gefunden.",

    poiDetail: "Ortsdetails",
    back: "Zurück",
    narrationTitle: "Audioguide",
    stop: "Stoppen",
    listenNarration: "Audioguide anhören",
    viewMap: "Auf Karte anzeigen",
    latitude: "Breitengrad",
    longitude: "Längengrad",
    radius: "Radius",
    cityHcm: "Ho-Chi-Minh-Stadt",

    mapTitle: "Ortskarte",
    mapText:
      "Echte Karte mit Ihrem aktuellen Standort und POIs aus dem Backend.",
    myLocation: "Mein Standort",
    locating: "Standort wird ermittelt...",
    locationDenied:
      "Standort konnte nicht abgerufen werden. Erlauben Sie dem Browser den Standortzugriff.",
    currentLocation: "Aktueller Standort",
    poiCount: "POIs",
    selectPoi: "POI auswählen",
    openOSM: "OpenStreetMap öffnen",
suggestRoute: "Route vorschlagen",
recommendedRoute: "Empfohlene Tourroute",
selectRoutePoiCount: "Wählen Sie die Anzahl der Orte aus, die Sie besuchen möchten.",
next: "Weiter",
estimatedTotalDistance: "Geschätzte Gesamtentfernung:",
openDirections: "Navigation öffnen",
closeRoute: "Route schließen",
    chatTitle: "KI-Agent",
    chatText:
      "Fragen Sie nach POIs und dem Wissen der App.",
    send: "Senden",
    chatPlaceholder:
      "Beispiel: Was ist an diesem Ort besonders?",
    aiNotReady:
      "Das KI-Backend/RAG ist in dieser Phase noch nicht verbunden. Die Oberfläche ist für die gemeinsame Knowledge Base von Mobile und Web vorbereitet.",

    profileTitle: "Konto",
    addPoi: "POI hinzufügen",
    addPoiTitle: "Ort vorschlagen",
    addPoiText:
      "Ihre Informationen werden an das Backend gesendet und vom Admin geprüft.",
    nameVi: "Vietnamesischer Name",
    nameEn: "Englischer Name",
    nameZh: "Chinesischer Name",
    descVi: "Vietnamesische Beschreibung",
    descEn: "Englische Beschreibung",
    descZh: "Chinesische Beschreibung",
    category: "Kategorie",
    location: "Standort",
    useMyLocation: "Meinen Standort verwenden",
    submitPoi: "POI senden",
    submitting: "Wird gesendet...",
    poiSubmitted:
      "POI wurde gesendet. Bitte warten Sie auf die Prüfung durch den Admin.",
    required:
      "Bitte füllen Sie alle erforderlichen Informationen aus.",

    loading: "Wird geladen...",
    user: "Benutzer",
    role: "Rolle",
  },

  es: {
    home: "Inicio",
    explore: "Explorar",
    map: "Mapa",
    chat: "Agente IA",
    profile: "Cuenta",

    logout: "Cerrar sesión",
    welcome: "Bienvenido",
    discover: "DESCUBRIR",
    intro:
      "Encuentra lugares, consulta información y escucha las narraciones en tu idioma.",

    openMap: "Abrir mapa",
    askAI: "Preguntar a la IA",
    searchPlace: "Buscar lugares...",
    nearby: "Lugares cercanos",
    seeAll: "Ver todos →",
    detail: "Detalles",
    listen: "Escuchar",
    tourism: "Turismo",
    food: "Comida",

    mapFeature: "Mapa y ubicación",
    mapFeatureText:
      "Sigue tu ubicación y explora los POI en el mapa.",
    narration: "Narración",
    narrationText:
      "Escucha el contenido de los POI con TTS en el idioma seleccionado.",
    aiFeature: "Agente IA",
    aiFeatureText:
      "Pregunta sobre lugares y conocimientos disponibles en la aplicación.",

    exploreTitle: "Explorar lugares",
    exploreText:
      "POI compartidos con Mobile mediante el Backend.",
    all: "Todos",
    places: "lugares",
    noResults: "No se encontraron lugares adecuados.",

    poiDetail: "Detalles del lugar",
    back: "Volver",
    narrationTitle: "Narración",
    stop: "Detener",
    listenNarration: "Escuchar narración",
    viewMap: "Ver en el mapa",
    latitude: "Latitud",
    longitude: "Longitud",
    radius: "Radio",
    cityHcm: "Ciudad Ho Chi Minh",

    mapTitle: "Mapa de lugares",
    mapText:
      "Mapa real con tu ubicación actual y los POI del Backend.",
    myLocation: "Mi ubicación",
    locating: "Obteniendo ubicación...",
    locationDenied:
      "No se puede obtener tu ubicación. Permite al navegador acceder a ella.",
    currentLocation: "Ubicación actual",
    poiCount: "POI",
    selectPoi: "Seleccionar POI",
    openOSM: "Abrir OpenStreetMap",
suggestRoute: "Sugerir ruta",
recommendedRoute: "Ruta turística recomendada",
selectRoutePoiCount: "Elige cuántos lugares quieres visitar.",
next: "Siguiente",
estimatedTotalDistance: "Distancia total estimada:",
openDirections: "Abrir indicaciones",
closeRoute: "Cerrar ruta",
    chatTitle: "Agente IA",
    chatText:
      "Pregunta sobre los POI y los conocimientos de la aplicación.",
    send: "Enviar",
    chatPlaceholder:
      "Ejemplo: ¿Qué tiene de especial este lugar?",
    aiNotReady:
      "El Backend/RAG de IA aún no está conectado en esta fase. La interfaz está preparada para la Knowledge Base compartida entre Mobile y Web.",

    profileTitle: "Cuenta",
    addPoi: "Añadir POI",
    addPoiTitle: "Sugerir un lugar",
    addPoiText:
      "La información se enviará al Backend y será revisada por el Admin.",
    nameVi: "Nombre vietnamita",
    nameEn: "Nombre en inglés",
    nameZh: "Nombre chino",
    descVi: "Descripción vietnamita",
    descEn: "Descripción en inglés",
    descZh: "Descripción china",
    category: "Categoría",
    location: "Ubicación",
    useMyLocation: "Usar mi ubicación",
    submitPoi: "Enviar POI",
    submitting: "Enviando...",
    poiSubmitted:
      "POI enviado. Espera la revisión del Admin.",
    required:
      "Completa toda la información obligatoria.",

    loading: "Cargando...",
    user: "Usuario",
    role: "Rol",
  },

  it: {
    home: "Home",
    explore: "Esplora",
    map: "Mappa",
    chat: "Agente AI",
    profile: "Account",

    logout: "Esci",
    welcome: "Benvenuto",
    discover: "SCOPRI",
    intro:
      "Trova luoghi, consulta informazioni e ascolta le descrizioni nella tua lingua.",

    openMap: "Apri mappa",
    askAI: "Chiedi all'AI",
    searchPlace: "Cerca luoghi...",
    nearby: "Luoghi vicini",
    seeAll: "Vedi tutto →",
    detail: "Dettagli",
    listen: "Ascolta",
    tourism: "Turismo",
    food: "Cibo",

    mapFeature: "Mappa e posizione",
    mapFeatureText:
      "Segui la tua posizione ed esplora i POI sulla mappa.",
    narration: "Audioguida",
    narrationText:
      "Ascolta i contenuti dei POI con TTS nella lingua selezionata.",
    aiFeature: "Agente AI",
    aiFeatureText:
      "Chiedi informazioni sui luoghi e sulle conoscenze disponibili nell'app.",

    exploreTitle: "Esplora luoghi",
    exploreText:
      "POI condivisi con Mobile tramite Backend.",
    all: "Tutti",
    places: "luoghi",
    noResults: "Nessun luogo corrispondente trovato.",

    poiDetail: "Dettagli del luogo",
    back: "Indietro",
    narrationTitle: "Audioguida",
    stop: "Ferma",
    listenNarration: "Ascolta audioguida",
    viewMap: "Visualizza sulla mappa",
    latitude: "Latitudine",
    longitude: "Longitudine",
    radius: "Raggio",
    cityHcm: "Città di Ho Chi Minh",

    mapTitle: "Mappa dei luoghi",
    mapText:
      "Mappa reale con la tua posizione attuale e i POI dal Backend.",
    myLocation: "La mia posizione",
    locating: "Rilevamento della posizione...",
    locationDenied:
      "Impossibile ottenere la posizione. Consenti al browser di accedere alla posizione.",
    currentLocation: "Posizione attuale",
    poiCount: "POI",
    selectPoi: "Seleziona POI",
    openOSM: "Apri OpenStreetMap",
suggestRoute: "Suggerisci percorso",
recommendedRoute: "Percorso turistico consigliato",
selectRoutePoiCount: "Scegli il numero di luoghi che vuoi visitare.",
next: "Avanti",
estimatedTotalDistance: "Distanza totale stimata:",
openDirections: "Apri indicazioni",
closeRoute: "Chiudi percorso",
    chatTitle: "Agente AI",
    chatText:
      "Chiedi informazioni sui POI e sulle conoscenze dell'app.",
    send: "Invia",
    chatPlaceholder:
      "Esempio: Cosa c'è di speciale in questo luogo?",
    aiNotReady:
      "Il Backend/RAG dell'AI non è ancora collegato in questa fase. L'interfaccia è pronta per la Knowledge Base condivisa tra Mobile e Web.",

    profileTitle: "Account",
    addPoi: "Aggiungi POI",
    addPoiTitle: "Suggerisci un luogo",
    addPoiText:
      "Le informazioni saranno inviate al Backend e revisionate dall'Admin.",
    nameVi: "Nome vietnamita",
    nameEn: "Nome inglese",
    nameZh: "Nome cinese",
    descVi: "Descrizione vietnamita",
    descEn: "Descrizione inglese",
    descZh: "Descrizione cinese",
    category: "Categoria",
    location: "Posizione",
    useMyLocation: "Usa la mia posizione",
    submitPoi: "Invia POI",
    submitting: "Invio...",
    poiSubmitted:
      "POI inviato. Attendi la revisione dell'Admin.",
    required:
      "Inserisci tutte le informazioni obbligatorie.",

    loading: "Caricamento...",
    user: "Utente",
    role: "Ruolo",
  },

  pt: {
    home: "Início",
    explore: "Explorar",
    map: "Mapa",
    chat: "Agente de IA",
    profile: "Conta",

    logout: "Sair",
    welcome: "Bem-vindo",
    discover: "DESCOBRIR",
    intro:
      "Encontre lugares, veja informações e ouça narrações no seu idioma.",

    openMap: "Abrir mapa",
    askAI: "Perguntar à IA",
    searchPlace: "Pesquisar lugares...",
    nearby: "Lugares próximos",
    seeAll: "Ver todos →",
    detail: "Detalhes",
    listen: "Ouvir",
    tourism: "Turismo",
    food: "Comida",

    mapFeature: "Mapa e localização",
    mapFeatureText:
      "Acompanhe sua localização e explore POIs no mapa.",
    narration: "Narração",
    narrationText:
      "Ouça o conteúdo dos POIs com TTS no idioma selecionado.",
    aiFeature: "Agente de IA",
    aiFeatureText:
      "Pergunte sobre lugares e conhecimentos disponíveis no aplicativo.",

    exploreTitle: "Explorar lugares",
    exploreText:
      "POIs compartilhados com o Mobile através do Backend.",
    all: "Todos",
    places: "lugares",
    noResults: "Nenhum lugar correspondente encontrado.",

    poiDetail: "Detalhes do local",
    back: "Voltar",
    narrationTitle: "Narração",
    stop: "Parar",
    listenNarration: "Ouvir narração",
    viewMap: "Ver no mapa",
    latitude: "Latitude",
    longitude: "Longitude",
    radius: "Raio",
    cityHcm: "Cidade de Ho Chi Minh",

    mapTitle: "Mapa de lugares",
    mapText:
      "Mapa real com sua localização atual e os POIs do Backend.",
    myLocation: "Minha localização",
    locating: "Obtendo localização...",
    locationDenied:
      "Não foi possível obter sua localização. Permita que o navegador acesse sua localização.",
    currentLocation: "Localização atual",
    poiCount: "POIs",
    selectPoi: "Selecionar POI",
    openOSM: "Abrir OpenStreetMap",
suggestRoute: "Sugerir rota",
recommendedRoute: "Rota turística recomendada",
selectRoutePoiCount: "Escolha quantos locais deseja visitar.",
next: "Próximo",
estimatedTotalDistance: "Distância total estimada:",
openDirections: "Abrir direções",
closeRoute: "Fechar rota",
    chatTitle: "Agente de IA",
    chatText:
      "Pergunte sobre POIs e conhecimentos do aplicativo.",
    send: "Enviar",
    chatPlaceholder:
      "Exemplo: O que há de especial neste lugar?",
    aiNotReady:
      "O Backend/RAG da IA ainda não está conectado nesta fase. A interface está pronta para a Knowledge Base compartilhada entre Mobile e Web.",

    profileTitle: "Conta",
    addPoi: "Adicionar POI",
    addPoiTitle: "Sugerir um lugar",
    addPoiText:
      "As informações serão enviadas ao Backend e analisadas pelo Admin.",
    nameVi: "Nome em vietnamita",
    nameEn: "Nome em inglês",
    nameZh: "Nome em chinês",
    descVi: "Descrição em vietnamita",
    descEn: "Descrição em inglês",
    descZh: "Descrição em chinês",
    category: "Categoria",
    location: "Localização",
    useMyLocation: "Usar minha localização",
    submitPoi: "Enviar POI",
    submitting: "Enviando...",
    poiSubmitted:
      "POI enviado. Aguarde a revisão do Admin.",
    required:
      "Preencha todas as informações obrigatórias.",

    loading: "Carregando...",
    user: "Usuário",
    role: "Função",
  },

  ru: {
    home: "Главная",
    explore: "Исследовать",
    map: "Карта",
    chat: "AI-агент",
    profile: "Аккаунт",

    logout: "Выйти",
    welcome: "Добро пожаловать",
    discover: "ИССЛЕДОВАТЬ",
    intro:
      "Находите места, просматривайте информацию и слушайте описание на своем языке.",

    openMap: "Открыть карту",
    askAI: "Спросить AI",
    searchPlace: "Поиск мест...",
    nearby: "Места рядом",
    seeAll: "Посмотреть все →",
    detail: "Подробнее",
    listen: "Слушать",
    tourism: "Туризм",
    food: "Еда",

    mapFeature: "Карта и местоположение",
    mapFeatureText:
      "Отслеживайте свое местоположение и исследуйте POI на карте.",
    narration: "Аудиогид",
    narrationText:
      "Слушайте содержимое POI с помощью TTS на выбранном языке.",
    aiFeature: "AI-агент",
    aiFeatureText:
      "Задавайте вопросы о местах и знаниях, доступных в приложении.",

    exploreTitle: "Исследовать места",
    exploreText:
      "POI, доступные Mobile через Backend.",
    all: "Все",
    places: "мест",
    noResults: "Подходящие места не найдены.",

    poiDetail: "Информация о месте",
    back: "Назад",
    narrationTitle: "Аудиогид",
    stop: "Остановить",
    listenNarration: "Слушать описание",
    viewMap: "Показать на карте",
    latitude: "Широта",
    longitude: "Долгота",
    radius: "Радиус",
    cityHcm: "Хошимин",

    mapTitle: "Карта мест",
    mapText:
      "Реальная карта с вашим текущим местоположением и POI из Backend.",
    myLocation: "Мое местоположение",
    locating: "Определение местоположения...",
    locationDenied:
      "Не удалось получить местоположение. Разрешите браузеру доступ к нему.",
    currentLocation: "Текущее местоположение",
    poiCount: "POI",
    selectPoi: "Выбрать POI",
    openOSM: "Открыть OpenStreetMap",
suggestRoute: "Предложить маршрут",
recommendedRoute: "Рекомендуемый туристический маршрут",
selectRoutePoiCount: "Выберите количество мест для посещения.",
next: "Далее",
estimatedTotalDistance: "Расстояние всего:",
openDirections: "Открыть навигацию",
closeRoute: "Закрыть маршрут",
    chatTitle: "AI-агент",
    chatText:
      "Задавайте вопросы о POI и знаниях приложения.",
    send: "Отправить",
    chatPlaceholder:
      "Например: Что особенного в этом месте?",
    aiNotReady:
      "AI Backend/RAG еще не подключен на этом этапе. Интерфейс готов к подключению общей Knowledge Base для Mobile и Web.",

    profileTitle: "Аккаунт",
    addPoi: "Добавить POI",
    addPoiTitle: "Предложить место",
    addPoiText:
      "Информация будет отправлена в Backend и проверена Admin.",
    nameVi: "Вьетнамское название",
    nameEn: "Английское название",
    nameZh: "Китайское название",
    descVi: "Вьетнамское описание",
    descEn: "Английское описание",
    descZh: "Китайское описание",
    category: "Категория",
    location: "Местоположение",
    useMyLocation: "Использовать мое местоположение",
    submitPoi: "Отправить POI",
    submitting: "Отправка...",
    poiSubmitted:
      "POI отправлен. Дождитесь проверки Admin.",
    required:
      "Заполните всю необходимую информацию.",

    loading: "Загрузка...",
    user: "Пользователь",
    role: "Роль",
  },

  th: {
    home: "หน้าแรก",
    explore: "สำรวจ",
    map: "แผนที่",
    chat: "AI Agent",
    profile: "บัญชี",

    logout: "ออกจากระบบ",
    welcome: "ยินดีต้อนรับ",
    discover: "สำรวจ",
    intro:
      "ค้นหาสถานที่ ดูข้อมูล และฟังคำบรรยายในภาษาของคุณ",

    openMap: "เปิดแผนที่",
    askAI: "ถาม AI",
    searchPlace: "ค้นหาสถานที่...",
    nearby: "สถานที่ใกล้คุณ",
    seeAll: "ดูทั้งหมด →",
    detail: "รายละเอียด",
    listen: "ฟัง",
    tourism: "ท่องเที่ยว",
    food: "อาหาร",

    mapFeature: "แผนที่และตำแหน่ง",
    mapFeatureText:
      "ติดตามตำแหน่งของคุณและสำรวจ POI บนแผนที่",
    narration: "คำบรรยาย",
    narrationText:
      "ฟังเนื้อหา POI ด้วย TTS ในภาษาที่เลือก",
    aiFeature: "AI Agent",
    aiFeatureText:
      "ถามเกี่ยวกับสถานที่และความรู้ที่มีอยู่ในแอป",

    exploreTitle: "สำรวจสถานที่",
    exploreText:
      "POI ที่แชร์กับ Mobile ผ่าน Backend",
    all: "ทั้งหมด",
    places: "สถานที่",
    noResults: "ไม่พบสถานที่ที่ตรงกัน",

    poiDetail: "รายละเอียดสถานที่",
    back: "กลับ",
    narrationTitle: "คำบรรยาย",
    stop: "หยุด",
    listenNarration: "ฟังคำบรรยาย",
    viewMap: "ดูบนแผนที่",
    latitude: "ละติจูด",
    longitude: "ลองจิจูด",
    radius: "รัศมี",
    cityHcm: "นครโฮจิมินห์",

    mapTitle: "แผนที่สถานที่",
    mapText:
      "แผนที่จริงพร้อมตำแหน่งปัจจุบันและ POI จาก Backend",
    myLocation: "ตำแหน่งของฉัน",
    locating: "กำลังค้นหาตำแหน่ง...",
    locationDenied:
      "ไม่สามารถรับตำแหน่งได้ โปรดอนุญาตให้เบราว์เซอร์เข้าถึงตำแหน่งของคุณ",
    currentLocation: "ตำแหน่งปัจจุบัน",
    poiCount: "POI",
    selectPoi: "เลือก POI",
    openOSM: "เปิด OpenStreetMap",
suggestRoute: "แนะนำเส้นทาง",
recommendedRoute: "เส้นทางท่องเที่ยวที่แนะนำ",
selectRoutePoiCount: "เลือกจำนวนสถานที่ที่ต้องการเยี่ยมชม",
next: "ถัดไป",
estimatedTotalDistance: "ระยะทางโดยประมาณทั้งหมด:",
openDirections: "เปิดเส้นทาง",
closeRoute: "ปิดเส้นทาง",
    chatTitle: "AI Agent",
    chatText: "ถามเกี่ยวกับ POI และความรู้ของแอป",
    send: "ส่ง",
    chatPlaceholder:
      "ตัวอย่าง: สถานที่นี้มีอะไรพิเศษ?",
    aiNotReady:
      "AI Backend/RAG ยังไม่ได้เชื่อมต่อในขั้นตอนนี้ UI พร้อมสำหรับ Knowledge Base ที่ใช้ร่วมกันระหว่าง Mobile และ Web",

    profileTitle: "บัญชี",
    addPoi: "เพิ่ม POI",
    addPoiTitle: "แนะนำสถานที่",
    addPoiText:
      "ข้อมูลจะถูกส่งไปยัง Backend และรอการตรวจสอบจาก Admin",
    nameVi: "ชื่อภาษาเวียดนาม",
    nameEn: "ชื่อภาษาอังกฤษ",
    nameZh: "ชื่อภาษาจีน",
    descVi: "คำอธิบายภาษาเวียดนาม",
    descEn: "คำอธิบายภาษาอังกฤษ",
    descZh: "คำอธิบายภาษาจีน",
    category: "หมวดหมู่",
    location: "ตำแหน่ง",
    useMyLocation: "ใช้ตำแหน่งของฉัน",
    submitPoi: "ส่ง POI",
    submitting: "กำลังส่ง...",
    poiSubmitted:
      "ส่ง POI แล้ว กรุณารอ Admin ตรวจสอบ",
    required: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน",

    loading: "กำลังโหลด...",
    user: "ผู้ใช้",
    role: "บทบาท",
  },

  id: {
    home: "Beranda",
    explore: "Jelajahi",
    map: "Peta",
    chat: "Agen AI",
    profile: "Akun",

    logout: "Keluar",
    welcome: "Selamat datang",
    discover: "JELAJAHI",
    intro:
      "Temukan tempat, lihat informasi, dan dengarkan narasi dalam bahasa Anda.",

    openMap: "Buka peta",
    askAI: "Tanya AI",
    searchPlace: "Cari tempat...",
    nearby: "Tempat di dekat Anda",
    seeAll: "Lihat semua →",
    detail: "Detail",
    listen: "Dengarkan",
    tourism: "Wisata",
    food: "Makanan",

    mapFeature: "Peta & lokasi",
    mapFeatureText:
      "Lacak lokasi Anda dan jelajahi POI di peta.",
    narration: "Narasi",
    narrationText:
      "Dengarkan konten POI dengan TTS dalam bahasa yang dipilih.",
    aiFeature: "Agen AI",
    aiFeatureText:
      "Tanyakan tentang tempat dan pengetahuan yang tersedia di aplikasi.",

    exploreTitle: "Jelajahi tempat",
    exploreText:
      "POI yang dibagikan dengan Mobile melalui Backend.",
    all: "Semua",
    places: "tempat",
    noResults: "Tidak ada tempat yang cocok.",

    poiDetail: "Detail tempat",
    back: "Kembali",
    narrationTitle: "Narasi",
    stop: "Berhenti",
    listenNarration: "Dengarkan narasi",
    viewMap: "Lihat di peta",
    latitude: "Lintang",
    longitude: "Bujur",
    radius: "Radius",
    cityHcm: "Kota Ho Chi Minh",

    mapTitle: "Peta tempat",
    mapText:
      "Peta nyata dengan lokasi Anda saat ini dan POI dari Backend.",
    myLocation: "Lokasi saya",
    locating: "Mendapatkan lokasi...",
    locationDenied:
      "Tidak dapat mendapatkan lokasi. Izinkan browser mengakses lokasi Anda.",
    currentLocation: "Lokasi saat ini",
    poiCount: "POI",
    selectPoi: "Pilih POI",
    openOSM: "Buka OpenStreetMap",

    chatTitle: "Agen AI",
    chatText:
      "Tanyakan tentang POI dan pengetahuan aplikasi.",
    send: "Kirim",
    chatPlaceholder:
      "Contoh: Apa yang istimewa dari tempat ini?",
    aiNotReady:
      "AI Backend/RAG belum terhubung pada tahap ini. UI siap terhubung ke Knowledge Base bersama untuk Mobile dan Web.",

    profileTitle: "Akun",
    addPoi: "Tambah POI",
    addPoiTitle: "Sarankan tempat",
    addPoiText:
      "Informasi akan dikirim ke Backend dan ditinjau oleh Admin.",
    nameVi: "Nama Vietnam",
    nameEn: "Nama Inggris",
    nameZh: "Nama Tionghoa",
    descVi: "Deskripsi Vietnam",
    descEn: "Deskripsi Inggris",
    descZh: "Deskripsi Tionghoa",
    category: "Kategori",
    location: "Lokasi",
    useMyLocation: "Gunakan lokasi saya",
    submitPoi: "Kirim POI",
    submitting: "Mengirim...",
    poiSubmitted:
      "POI telah dikirim. Tunggu peninjauan Admin.",
    required:
      "Silakan isi semua informasi yang diperlukan.",

    loading: "Memuat...",
    user: "Pengguna",
    role: "Peran",
  },

  ms: {
    home: "Laman Utama",
    explore: "Teroka",
    map: "Peta",
    chat: "Ejen AI",
    profile: "Akaun",

    logout: "Log keluar",
    welcome: "Selamat datang",
    discover: "TEROKA",
    intro:
      "Cari tempat, lihat maklumat dan dengar penerangan dalam bahasa anda.",

    openMap: "Buka peta",
    askAI: "Tanya AI",
    searchPlace: "Cari tempat...",
    nearby: "Tempat berdekatan",
    seeAll: "Lihat semua →",
    detail: "Butiran",
    listen: "Dengar",
    tourism: "Pelancongan",
    food: "Makanan",

    mapFeature: "Peta & lokasi",
    mapFeatureText:
      "Jejaki lokasi anda dan teroka POI pada peta.",
    narration: "Penerangan audio",
    narrationText:
      "Dengar kandungan POI dengan TTS dalam bahasa yang dipilih.",
    aiFeature: "Ejen AI",
    aiFeatureText:
      "Tanya tentang tempat dan pengetahuan yang tersedia dalam aplikasi.",

    exploreTitle: "Teroka tempat",
    exploreText:
      "POI yang dikongsi dengan Mobile melalui Backend.",
    all: "Semua",
    places: "tempat",
    noResults: "Tiada tempat yang sepadan ditemui.",

    poiDetail: "Butiran tempat",
    back: "Kembali",
    narrationTitle: "Penerangan audio",
    stop: "Berhenti",
    listenNarration: "Dengar penerangan",
    viewMap: "Lihat pada peta",
    latitude: "Latitud",
    longitude: "Longitud",
    radius: "Jejari",
    cityHcm: "Bandar Ho Chi Minh",

    mapTitle: "Peta tempat",
    mapText:
      "Peta sebenar dengan lokasi semasa anda dan POI daripada Backend.",
    myLocation: "Lokasi saya",
    locating: "Mendapatkan lokasi...",
    locationDenied:
      "Tidak dapat mendapatkan lokasi. Benarkan pelayar mengakses lokasi anda.",
    currentLocation: "Lokasi semasa",
    poiCount: "POI",
    selectPoi: "Pilih POI",
    openOSM: "Buka OpenStreetMap",
suggestRoute: "Sarankan Rute",
recommendedRoute: "Rute Wisata yang Direkomendasikan",
selectRoutePoiCount: "Pilih jumlah tempat yang ingin Anda kunjungi.",
next: "Berikutnya",
estimatedTotalDistance: "Perkiraan jarak total:",
openDirections: "Buka Petunjuk Arah",
closeRoute: "Tutup Rute",
    chatTitle: "Ejen AI",
    chatText:
      "Tanya tentang POI dan pengetahuan aplikasi.",
    send: "Hantar",
    chatPlaceholder:
      "Contoh: Apakah yang istimewa tentang tempat ini?",
    aiNotReady:
      "AI Backend/RAG belum disambungkan pada fasa ini. UI sedia untuk disambungkan kepada Knowledge Base yang dikongsi oleh Mobile dan Web.",

    profileTitle: "Akaun",
    addPoi: "Tambah POI",
    addPoiTitle: "Cadangkan tempat",
    addPoiText:
      "Maklumat akan dihantar ke Backend dan disemak oleh Admin.",
    nameVi: "Nama Vietnam",
    nameEn: "Nama Inggeris",
    nameZh: "Nama Cina",
    descVi: "Penerangan Vietnam",
    descEn: "Penerangan Inggeris",
    descZh: "Penerangan Cina",
    category: "Kategori",
    location: "Lokasi",
    useMyLocation: "Gunakan lokasi saya",
    submitPoi: "Hantar POI",
    submitting: "Menghantar...",
    poiSubmitted:
      "POI telah dihantar. Sila tunggu semakan Admin.",
    required:
      "Sila isi semua maklumat yang diperlukan.",

    loading: "Memuatkan...",
    user: "Pengguna",
    role: "Peranan",
  },

  hi: {
    home: "होम",
    explore: "अन्वेषण",
    map: "मानचित्र",
    chat: "AI एजेंट",
    profile: "खाता",

    logout: "लॉग आउट",
    welcome: "स्वागत है",
    discover: "खोजें",
    intro:
      "स्थान खोजें, जानकारी देखें और अपनी भाषा में विवरण सुनें।",

    openMap: "मानचित्र खोलें",
    askAI: "AI से पूछें",
    searchPlace: "स्थान खोजें...",
    nearby: "आपके पास के स्थान",
    seeAll: "सभी देखें →",
    detail: "विवरण",
    listen: "सुनें",
    tourism: "पर्यटन",
    food: "भोजन",

    mapFeature: "मानचित्र और स्थान",
    mapFeatureText:
      "अपना स्थान देखें और मानचित्र पर POI खोजें।",
    narration: "विवरण",
    narrationText:
      "चयनित भाषा में TTS द्वारा POI की जानकारी सुनें।",
    aiFeature: "AI एजेंट",
    aiFeatureText:
      "ऐप में उपलब्ध स्थानों और जानकारी के बारे में पूछें।",

    exploreTitle: "स्थान खोजें",
    exploreText:
      "Backend के माध्यम से Mobile के साथ साझा किए गए POI।",
    all: "सभी",
    places: "स्थान",
    noResults: "कोई उपयुक्त स्थान नहीं मिला।",

    poiDetail: "स्थान का विवरण",
    back: "वापस",
    narrationTitle: "विवरण",
    stop: "रोकें",
    listenNarration: "विवरण सुनें",
    viewMap: "मानचित्र पर देखें",
    latitude: "अक्षांश",
    longitude: "देशांतर",
    radius: "त्रिज्या",
    cityHcm: "हो ची मिन्ह सिटी",

    mapTitle: "स्थान मानचित्र",
    mapText:
      "आपके वर्तमान स्थान और Backend के POI के साथ वास्तविक मानचित्र।",
    myLocation: "मेरा स्थान",
    locating: "स्थान प्राप्त किया जा रहा है...",
    locationDenied:
      "स्थान प्राप्त नहीं किया जा सका। ब्राउज़र को स्थान की अनुमति दें।",
    currentLocation: "वर्तमान स्थान",
    poiCount: "POI",
    selectPoi: "POI चुनें",
    openOSM: "OpenStreetMap खोलें",
suggestRoute: "Cadangkan Laluan",
recommendedRoute: "Laluan Lawatan Disyorkan",
selectRoutePoiCount: "Pilih jumlah tempat yang ingin anda lawati.",
next: "Seterusnya",
estimatedTotalDistance: "Anggaran jumlah jarak:",
openDirections: "Buka Arah",
closeRoute: "Tutup Laluan",
    chatTitle: "AI एजेंट",
    chatText:
      "POI और ऐप की जानकारी के बारे में पूछें।",
    send: "भेजें",
    chatPlaceholder:
      "उदाहरण: इस स्थान की खासियत क्या है?",
    aiNotReady:
      "इस चरण में AI Backend/RAG अभी कनेक्ट नहीं है। UI Mobile और Web के साझा Knowledge Base से जुड़ने के लिए तैयार है।",

    profileTitle: "खाता",
    addPoi: "POI जोड़ें",
    addPoiTitle: "स्थान सुझाएँ",
    addPoiText:
      "जानकारी Backend को भेजी जाएगी और Admin द्वारा समीक्षा की जाएगी।",
    nameVi: "वियतनामी नाम",
    nameEn: "अंग्रेज़ी नाम",
    nameZh: "चीनी नाम",
    descVi: "वियतनामी विवरण",
    descEn: "अंग्रेज़ी विवरण",
    descZh: "चीनी विवरण",
    category: "श्रेणी",
    location: "स्थान",
    useMyLocation: "मेरा स्थान उपयोग करें",
    submitPoi: "POI भेजें",
    submitting: "भेजा जा रहा है...",
    poiSubmitted:
      "POI भेज दिया गया है। Admin की समीक्षा की प्रतीक्षा करें।",
    required:
      "कृपया सभी आवश्यक जानकारी भरें।",

    loading: "लोड हो रहा है...",
    user: "उपयोगकर्ता",
    role: "भूमिका",
  },
};

export function getLanguage() {
  return localStorage.getItem("app_language") || "vi";
}

export function setLanguage(code) {
  localStorage.setItem("app_language", code);
  window.dispatchEvent(
    new Event("app-language-change")
  );
}

export function useLanguage() {
  const [language, setValue] =
    useState(getLanguage);

  useEffect(() => {
    const onChange = () => {
      setValue(getLanguage());
    };

    window.addEventListener(
      "app-language-change",
      onChange
    );

    return () =>
      window.removeEventListener(
        "app-language-change",
        onChange
      );
  }, []);

  return {
    language,
    setLanguage,
    t: DICT[language] || DICT.vi,
  };
}