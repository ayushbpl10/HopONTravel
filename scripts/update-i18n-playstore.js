const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'web', 'i18n.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. English Updates
code = code.replace(
  'hero_pill: "Weekend Ka Asli Plan • Ab Toh Ghoom Le",',
  'hero_pill: "🎉 NOW LIVE ON GOOGLE PLAY • GET THE OFFICIAL APP →",'
);

code = code.replace(
`    // App Download Section
    app_badge: "TAKE IT EVERYWHERE",
    app_title: "Download the Ab Toh Ghoom Le App",
    app_desc: "Get live bus radar notifications, offline QR boarding passes, and direct coordinator chat in your pocket.",
    app_download_apk: "Download Android APK (Direct)",
    app_scan_qr: "Scan with your phone to install directly",`,
`    // App Download Section
    app_badge: "OFFICIALLY ON GOOGLE PLAY",
    app_title: "Download the Official Ab Toh Ghoom Le App",
    app_desc: "We are officially live on Google Play Store! Track your tour coach in real time with live GPS radar, get offline QR boarding passes, and explore with verified captains at 0% middleman fees.",
    app_download_apk: "Get on Google Play →",
    app_scan_qr: "App Details & QR Code",`
);

code = code.replace(
`    // Download Page (download.html)
    dl_badge: "VIP EARLY ACCESS",
    dl_title: "Get Exclusive Access to<br/><span>Ab Toh Ghoom Le</span>",
    dl_sub: "India's premier group travel & weekend adventure app. Track live buses, chat with trip captains, and get offline boarding passes.",
    dl_btn_download: "Download Android APK (Direct) 🚀",
    dl_qr_text: "Scan with your phone camera to download directly",`,
`    // Download Page (download.html)
    dl_badge: "OFFICIALLY ON GOOGLE PLAY",
    dl_title: "Download the Official<br/><span>Ab Toh Ghoom Le</span> App",
    dl_sub: "India's premier group travel & weekend adventure app is now live on Google Play! Track live buses, chat with trip captains, and get offline boarding passes.",
    dl_btn_download: "Get it on Google Play 🚀",
    dl_qr_text: "Scan with your phone camera to open in Google Play",`
);

code = code.replace(
`    // Additional Download Page Elements
    dl_badge_vip: "Limited Early Access — VIP Club",
    dl_hero_h1: "Your next adventure<br/>starts <span class=\\"yellow caveat\\">right here</span>",
    dl_hero_desc: "Join a community of explorers getting exclusive access to the Ab Toh Ghoom Le app before the world does. Only a limited number of spots available.",
    dl_step1_label: "Step One • Unlock Your Access",
    dl_step1_title: "Join the VIP Tester Group",
    dl_step1_desc: "Opens Google Groups. Sign in with your Google account, then click the \\"Join group\\" button. This is what unlocks your Play Store download link.",
    dl_step1_btn: "Join the VIP Club →",
    dl_step2_label: "Step Two • Become a Tester",
    dl_step2_title: "Click \\"Become a Tester\\" on Play Store",
    dl_step2_desc: "Opens the Play Store testing page. Tap the \\"Become a tester\\" button — then tap \\"Download it on Google Play\\" that appears right below it.",
    dl_step2_btn: "🎯 Open Play Store Tester Page",
    dl_step3_label: "Step Three • You're In!",
    dl_step3_title: "Install, Open & Start Exploring",
    dl_step3_desc: "The app installs like any normal Play Store app. Open it, browse group trips, and book your next adventure. Welcome to the VIP club! 🎉",
    dl_pill_browse: "✅ Browse trips",
    dl_pill_book: "✅ Book instantly",
    dl_pill_track: "✅ Track your bus live",
    dl_important_note: "⚠️ Important: You must complete Step 1 (join the group) before Step 2 will work. Having trouble? Email us at",`,
`    // Additional Download Page Elements
    dl_badge_vip: "Official Google Play Release",
    dl_hero_h1: "Your next adventure<br/>starts <span class=\\"yellow caveat\\">right here</span>",
    dl_hero_desc: "The official Ab Toh Ghoom Le app is now live on Google Play! Download now to book weekend treks, track your tour bus live with GPS radar, and connect with verified tour captains across India.",
    dl_step1_label: "OFFICIAL ANDROID APP",
    dl_step1_title: "Get it on Google Play Store",
    dl_step1_desc: "Download directly from Google Play Store with 1 tap. 100% verified and secured by Google Play Protect.",
    dl_step1_btn: "⬇️ Download on Google Play →",
    dl_step2_label: "FAST PHONE ACCESS",
    dl_step2_title: "Scan QR Code on Mobile",
    dl_step2_desc: "Open your camera and scan the QR code to open the Google Play Store listing instantly on your Android device.",
    dl_step2_btn: "📱 Open Play Store Listing",
    dl_step3_label: "READY TO EXPLORE",
    dl_step3_title: "Install & Start Travelling",
    dl_step3_desc: "Install in seconds, browse verified weekend trips, and book your next escape with zero middleman fees! 🎉",
    dl_pill_browse: "✅ Browse treks & tours",
    dl_pill_book: "✅ 0% Commission booking",
    dl_pill_track: "✅ Live GPS radar",
    dl_important_note: "Need direct APK installation or have questions? Email us at",`
);

// 2. Hindi Updates
code = code.replace(
  'hero_pill: "वीकेंड का असली प्लान • अब तो घूम ले",',
  'hero_pill: "🎉 अब गूगल प्ले स्टोर पर लाइव • ऐप डाउनलोड करें →",'
);

code = code.replace(
`    // App Download Section (hi)
    app_badge: "हर जगह साथ रखें",
    app_title: "अब तो घूम ले ऐप डाउनलोड करें",
    app_desc: "लाइव बस राडार नोटिफिकेशन, ऑफलाइन क्यूआर बोर्डिंग पास और अपनी जेब में सीधा कोऑर्डिनेटर चैट पाएं।",
    app_download_apk: "एंड्रॉइड एपीके डाउनलोड करें (डायरेक्ट)",
    app_scan_qr: "सीधे इंस्टॉल करने के लिए अपने फोन से स्कैन करें",`,
`    // App Download Section (hi)
    app_badge: "गूगल प्ले स्टोर पर आधिकारिक रूप से लाइव",
    app_title: "आधिकारिक अब तो घूम ले ऐप डाउनलोड करें",
    app_desc: "हम अब आधिकारिक रूप से गूगल प्ले स्टोर पर लाइव हैं! लाइव जीपीएस रडार से अपनी बस ट्रैक करें, ऑफलाइन क्यूआर बोर्डिंग पास पाएं और बिना किसी बिचौलिए के सत्यापित कप्तानों के साथ यात्रा करें।",
    app_download_apk: "गूगल प्ले पर प्राप्त करें →",
    app_scan_qr: "ऐप विवरण और क्यूआर कोड",`
);

code = code.replace(
`    // Download Page (download.html)
    dl_badge: "वीआईपी अर्ली एक्सेस",
    dl_title: "विशेष पहुंच प्राप्त करें<br/><span>अब तो घूम ले</span>",
    dl_sub: "भारत का प्रमुख ग्रुप ट्रेवल और वीकेंड एडवेंचर ऐप। लाइव बस ट्रैक करें और ऑफलाइन बोर्डिंग पास पाएं।",
    dl_btn_download: "एंड्रॉइड एपीके डाउनलोड करें (डायरेक्ट) 🚀",
    dl_qr_text: "सीधे डाउनलोड करने के लिए फोन कैमरे से स्कैन करें",`,
`    // Download Page (download.html)
    dl_badge: "गूगल प्ले पर लाइव",
    dl_title: "आधिकारिक <br/><span>अब तो घूम ले</span> ऐप डाउनलोड करें",
    dl_sub: "भारत का प्रमुख ग्रुप ट्रेवल और वीकेंड एडवेंचर ऐप अब गूगल प्ले पर लाइव है! लाइव बस ट्रैक करें और ऑफलाइन बोर्डिंग पास पाएं।",
    dl_btn_download: "गूगल प्ले पर प्राप्त करें 🚀",
    dl_qr_text: "गूगल प्ले पर खोलने के लिए फोन कैमरे से स्कैन करें",`
);

code = code.replace(
`    // Additional Download Page Elements (hi)
    dl_badge_vip: "सीमित प्रारंभिक पहुंच — वीआईपी क्लब",
    dl_hero_h1: "आपका अगला एडवेंचर<br/><span class=\\"yellow caveat\\">यहीं से शुरू होता है</span>",
    dl_hero_desc: "दुनिया से पहले अब तो घूम ले ऐप की विशेष पहुंच पाने वाले खोजकर्ताओं के समुदाय में शामिल हों। केवल सीमित स्लॉट उपलब्ध हैं।",
    dl_step1_label: "पहला चरण • पहुंच अनलॉक करें",
    dl_step1_title: "VIP टेस्टर ग्रुप में शामिल हों",
    dl_step1_desc: "Google Groups खुलेगा। अपने गूगल खाते से साइन इन करें और \\"Join group\\" बटन पर क्लिक करें। इससे आपका प्ले स्टोर डाउनलोड लिंक अनलॉक होगा।",
    dl_step1_btn: "VIP क्लब में शामिल हों →",
    dl_step2_label: "दूसरा चरण • टेस्टर बनें",
    dl_step2_title: "प्ले स्टोर पर \\"Become a Tester\\" पर क्लिक करें",
    dl_step2_desc: "Play Store टेस्टिंग पेज खुलेगा। \\"Become a tester\\" बटन दबाएं — फिर ठीक नीचे दिखने वाले \\"Download it on Google Play\\" पर टैप करें।",
    dl_step2_btn: "🎯 प्ले स्टोर टेस्टर पेज खोलें",
    dl_step3_label: "तीसरा चरण • आप तैयार हैं!",
    dl_step3_title: "इंस्टॉल करें, खोलें और एक्सप्लोर करें",
    dl_step3_desc: "ऐप सामान्य प्ले स्टोर ऐप की तरह इंस्टॉल हो जाएगा। इसे खोलें, ग्रुप ट्रिप खोजें और अपनी अगली यात्रा बुक करें। वीआईपी क्लब में आपका स्वागत है! 🎉",
    dl_pill_browse: "✅ ट्रिप्स ब्राउज़ करें",
    dl_pill_book: "✅ तुरंत बुक करें",
    dl_pill_track: "✅ बस लाइव ट्रैक करें",
    dl_important_note: "⚠️ महत्वपूर्ण: चरण 2 काम करने से पहले आपको चरण 1 (ग्रुप में शामिल होना) पूरा करना होगा। कोई समस्या है? हमें ईमेल करें:",`,
`    // Additional Download Page Elements (hi)
    dl_badge_vip: "आधिकारिक गूगल प्ले रिलीज",
    dl_hero_h1: "आपका अगला एडवेंचर<br/>शुरू होता है <span class=\\"yellow caveat\\">यहीं से</span>",
    dl_hero_desc: "आधिकारिक अब तो घूम ले ऐप अब गूगल प्ले पर उपलब्ध है! वीकेंड ट्रेक बुक करने, लाइव जीपीएस बस ट्रैक करने और सत्यापित कप्तानों से जुड़ने के लिए अभी डाउनलोड करें।",
    dl_step1_label: "आधिकारिक एंड्रॉइड ऐप",
    dl_step1_title: "गूगल प्ले स्टोर से प्राप्त करें",
    dl_step1_desc: "1 टैप में गूगल प्ले स्टोर से सीधे डाउनलोड करें। गूगल प्ले प्रोटेक्ट द्वारा 100% सुरक्षित और सत्यापित।",
    dl_step1_btn: "⬇️ गूगल प्ले पर डाउनलोड करें →",
    dl_step2_label: "त्वरित मोबाइल एक्सेस",
    dl_step2_title: "मोबाइल पर क्यूआर कोड स्कैन करें",
    dl_step2_desc: "अपने फोन कैमरे से क्यूआर कोड स्कैन करें और एंड्रॉइड डिवाइस पर सीधे गूगल प्ले स्टोर लिस्टिंग खोलें।",
    dl_step2_btn: "📱 प्ले स्टोर लिस्टिंग खोलें",
    dl_step3_label: "घूमने के लिए तैयार",
    dl_step3_title: "इंस्टॉल करें और यात्रा शुरू करें",
    dl_step3_desc: "कुछ ही सेकंड में इंस्टॉल करें, सत्यापित वीकेंड ट्रिप देखें और शून्य कमीशन पर बुक करें! 🎉",
    dl_pill_browse: "✅ ट्रेक और टूर देखें",
    dl_pill_book: "✅ शून्य कमीशन बुकिंग",
    dl_pill_track: "✅ लाइव जीपीएस रडार",
    dl_important_note: "सीधे एपीके डाउनलोड या किसी सहायता के लिए हमें ईमेल करें:",`
);

// 3. Marathi Updates
code = code.replace(
  'hero_pill: "वीकेंडचा खरा प्लॅन • आता तर फिरून घे",',
  'hero_pill: "🎉 आता गुगल प्ले स्टोअरवर अधिकृतपणे उपलब्ध • ॲप मिळवा →",'
);

code = code.replace(
`    // App Download Section (mr)
    app_badge: "सर्वत्र सोबत ठेवा",
    app_title: "आता तर फिरून घे ॲप डाऊनलोड करा",
    app_desc: "लाईव्ह बस रडार सूचना, ऑफलाइन क्यूआर बोर्डिंग पास आणि थेट टूर समन्वयक चॅट आपल्या खिशात मिळवा.",
    app_download_apk: "अँड्रॉइड एपीके डाऊनलोड करा (थेट)",
    app_scan_qr: "थेट इन्स्टॉल करण्यासाठी आपल्या फोनवरून स्कॅन करा",`,
`    // App Download Section (mr)
    app_badge: "गुगल प्ले स्टोअरवर अधिकृतपणे लाइव्ह",
    app_title: "अधिकृत अब तो घूम ले ॲप डाउनलोड करा",
    app_desc: "आम्ही आता गुगल प्ले स्टोअरवर अधिकृतपणे उपलब्ध आहोत! थेट जीपीएस रडारने आपली बस ट्रॅक करा, ऑफलाइन क्यूआर बोर्डिंग पास मिळवा आणि कोणत्याही मध्यस्थाशिवाय सत्यापित कॅप्टनसोबत प्रवास करा.",
    app_download_apk: "गुगल प्लेवर मिळवा →",
    app_scan_qr: "ॲप तपशील आणि क्यूआर कोड",`
);

code = code.replace(
`    // Download Page (download.html)
    dl_badge: "व्हीआयपी अर्ली ॲक्सेस",
    dl_title: "खास ॲक्सेस मिळवा<br/><span>आता तर फिरून घे</span>",
    dl_sub: "भारतातील आघाडीचे ग्रुप ट्रॅव्हल आणि वीकेंड ॲडव्हेंचर ॲप. बस थेट ट्रॅक करा आणि ऑफलाइन बोर्डिंग पास मिळवा.",
    dl_btn_download: "अँड्रॉइड एपीके डाऊनलोड करा (थेट) 🚀",
    dl_qr_text: "थेट डाऊनलोड करण्यासाठी फोन कॅमेऱ्याने स्कॅन करा",`,
`    // Download Page (download.html)
    dl_badge: "गुगल प्लेवर लाइव्ह",
    dl_title: "अधिकृत <br/><span>आता तर फिरून घे</span> ॲप डाउनलोड करा",
    dl_sub: "भारतातील आघाडीचे ग्रुप ट्रॅव्हल आणि वीकेंड ॲडव्हेंचर ॲप आता गुगल प्लेवर उपलब्ध आहे! बस थेट ट्रॅक करा आणि ऑफलाइन बोर्डिंग पास मिळवा.",
    dl_btn_download: "गुगल प्लेवर मिळवा 🚀",
    dl_qr_text: "गुगल प्लेवर उघडण्यासाठी फोन कॅमेऱ्याने स्कॅन करा",`
);

code = code.replace(
`    // Additional Download Page Elements (mr)
    dl_badge_vip: "मर्यादित प्रारंभिक प्रवेश — व्हीआयपी क्लब",
    dl_hero_h1: "तुमची पुढची सफर<br/><span class=\\"yellow caveat\\">येथूनच सुरू होते</span>",
    dl_hero_desc: "जगाच्या आधी आता तर फिरून घे ॲपचा विशेष प्रवेश मिळवणाऱ्या भटक्यांच्या समुदायात सामील व्हा. मोजक्याच जागा उपलब्ध.",
    dl_step1_label: "पहिली पायरी • प्रवेश अनलॉक करा",
    dl_step1_title: "VIP टेस्टर ग्रुपमध्ये सामील व्हा",
    dl_step1_desc: "Google Groups उघडेल. तुमच्या गुगल खात्याने साइन इन करा आणि \\"Join group\\" बटणावर क्लिक करा. यामुळे तुमची प्ले स्टोअर डाउनलोड लिंक अनलॉक होईल.",
    dl_step1_btn: "VIP क्लबमध्ये सामील व्हा →",
    dl_step2_label: "दुसरी पायरी • टेस्टर बना",
    dl_step2_title: "प्ले स्टोअरवर \\"Become a Tester\\" वर क्लिक करा",
    dl_step2_desc: "Play Store टेस्टिंग पेज उघडेल. \\"Become a tester\\" बटणावर टॅप करा — नंतर खाली दिसणाऱ्या \\"Download it on Google Play\\" वर क्लिक करा.",
    dl_step2_btn: "🎯 प्ले स्टोअर टेस्टर पेज उघडा",
    dl_step3_label: "तिसरी पायरी • तुम्ही सज्ज आहात!",
    dl_step3_title: "इन्स्टॉल करा, उघडा आणि भटकायला लागा",
    dl_step3_desc: "ॲप सामान्य प्ले स्टोअर ॲपसारखे इन्स्टॉल होईल. ते उघडा, ग्रुप ट्रिप्स शोधा आणि पुढील सफर बुक करा. व्हीआयपी क्लबमध्ये स्वागत आहे! 🎉",
    dl_pill_browse: "✅ ट्रिप्स शोधा",
    dl_pill_book: "✅ झटपट बुक करा",
    dl_pill_track: "✅ बस थेट ट्रॅक करा",
    dl_important_note: "⚠️ महत्त्वाचे: पायरी 2 काम करण्यापूर्वी तुम्हाला पायरी 1 (ग्रुपमध्ये सामील होणे) पूर्ण करणे आवश्यक आहे. काही अडचण असल्यास आम्हाला ईमेल करा:",`,
`    // Additional Download Page Elements (mr)
    dl_badge_vip: "अधिकृत गुगल प्ले रिलीज",
    dl_hero_h1: "तुमची पुढची सफर<br/>सुरू होते <span class=\\"yellow caveat\\">येथूनच</span>",
    dl_hero_desc: "अधिकृत अब तो घूम ले ॲप आता गुगल प्लेवर उपलब्ध आहे! वीकेंड ट्रेक बुक करण्यासाठी, थेट जीपीएस बस ट्रॅक करण्यासाठी आणि कॅप्टनशी जोडण्यासाठी आताच डाउनलोड करा.",
    dl_step1_label: "अधिकृत अँड्रॉइड ॲप",
    dl_step1_title: "गुगल प्ले स्टोअरवरून मिळवा",
    dl_step1_desc: "एका क्लिकवर गुगल प्ले स्टोअरवरून थेट डाउनलोड करा. गुगल प्ले प्रोटेक्टद्वारे १००% सुरक्षित.",
    dl_step1_btn: "⬇️ गुगल प्लेवर डाउनलोड करा →",
    dl_step2_label: "जलद फोन ॲक्सेस",
    dl_step2_title: "मोबाईलवर क्यूआर कोड स्कॅन करा",
    dl_step2_desc: "आपल्या फोनच्या कॅमेऱ्याने क्यूआर कोड स्कॅन करा आणि प्ले स्टोअर लिस्टिंग थेट उघडा.",
    dl_step2_btn: "📱 प्ले स्टोअर लिस्टिंग उघडा",
    dl_step3_label: "प्रवासासाठी सज्ज",
    dl_step3_title: "इन्स्टॉल करा आणि प्रवास सुरू करा",
    dl_step3_desc: "काही सेकंदात इन्स्टॉल करा, सत्यापित सहली शोधा आणि शून्य कमिशनवर बुक करा! 🎉",
    dl_pill_browse: "✅ ट्रेक्स आणि सहली शोधा",
    dl_pill_book: "✅ शून्य कमिशन बुकिंग",
    dl_pill_track: "✅ थेट जीपीएस रडार",
    dl_important_note: "थेट एपीके किंवा मदतीसाठी आम्हाला ईमेल करा:",`
);

// 4. Kannada Updates
code = code.replace(
  'hero_pill: "ವಾರಾಂತ್ಯದ ಅಸಲಿ ಯೋಜನೆ • ಈಗಲಾದರೂ ತಿರುಗಾಡು",',
  'hero_pill: "🎉 ಗೂಗಲ್ ಪ್ಲೇ ಸ್ಟೋರ್‌ನಲ್ಲಿ ಅಧಿಕೃತವಾಗಿ ಲೈವ್ ಆಗಿದೆ • ಆಪ್ ಪಡೆಯಿರಿ →",'
);

code = code.replace(
`    // App Download Section (kn)
    app_badge: "ಎಲ್ಲೆಡೆ ಜೊತೆಯಲ್ಲಿಡಿ",
    app_title: "ಈಗಲಾದರೂ ತಿರುಗಾಡು ಆ್ಯಪ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    app_desc: "ಲೈವ್ ಬಸ್ ರೇಡಾರ್ ಅಧಿಸೂಚನೆಗಳು, ಆಫ್‌ಲೈನ್ ಕ್ಯೂಆರ್ ಬೋರ್ಡಿಂಗ್ ಪಾಸ್‌ಗಳು ಮತ್ತು ನೇರ ಸಂಯೋಜಕರ ಚಾಟ್ ಅನ್ನು ನಿಮ್ಮ ಜೇಬಿನಲ್ಲಿ ಪಡೆಯಿರಿ.",
    app_download_apk: "ಆಂಡ್ರಾಯ್ಡ್ ಎಪಿಕೆ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ (ನೇರ)",
    app_scan_qr: "ನೇರವಾಗಿ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಲು ನಿಮ್ಮ ಫೋನ್‌ನಿಂದ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",`,
`    // App Download Section (kn)
    app_badge: "ಗೂಗಲ್ ಪ್ಲೇ ಸ್ಟೋರ್‌ನಲ್ಲಿ ಲೈವ್ ಆಗಿದೆ",
    app_title: "ಅಧಿಕೃತ ಅಬ್ ತೋ ಘೂಮ್ ಲೇ ಆಪ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    app_desc: "ನಾವು ಈಗ ಗೂಗಲ್ ಪ್ಲೇ ಸ್ಟೋರ್‌ನಲ್ಲಿ ಲಭ್ಯವಿದ್ದೇವೆ! ಲೈವ್ ಜಿಪಿಎಸ್ ರಡಾರ್ ಮೂಲಕ ನಿಮ್ಮ ಬಸ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ, ಆಫ್‌ಲೈನ್ ಕ್ಯೂಆರ್ ಬೋರ್ಡಿಂಗ್ ಪಾಸ್ ಪಡೆಯಿರಿ ಮತ್ತು ಮಧ್ಯವರ್ತಿಗಳಿಲ್ಲದೆ ಸಾಹಸಯಾತ್ರೆ ಆನಂದಿಸಿ.",
    app_download_apk: "ಗೂಗಲ್ ಪ್ಲೇನಲ್ಲಿ ಪಡೆಯಿರಿ →",
    app_scan_qr: "ಆಪ್ ವಿವರಗಳು ಮತ್ತು ಕ್ಯೂಆರ್ ಕೋಡ್",`
);

code = code.replace(
`    // Download Page (download.html)
    dl_badge: "ವಿಐಪಿ ಆರಂಭಿಕ ಪ್ರವೇಶ",
    dl_title: "ವಿಶೇಷ ಪ್ರವೇಶ ಪಡೆಯಿರಿ<br/><span>ಈಗಲಾದರೂ ತಿರುಗಾಡು</span>",
    dl_sub: "ಭಾರತದ ಪ್ರಮುಖ ಗ್ರೂಪ್ ಟ್ರಾವೆಲ್ ಮತ್ತು ವೀಕೆಂಡ್ ಅಡ್ವೆಂಚರ್ ಆ್ಯಪ್. ಬಸ್ ಲೈವ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ ಮತ್ತು ಆಫ್‌ಲೈನ್ ಪಾಸ್ ಪಡೆಯಿರಿ.",
    dl_btn_download: "ಆಂಡ್ರಾಯ್ಡ್ ಎಪಿಕೆ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ (ನೇರ) 🚀",
    dl_qr_text: "ನೇರವಾಗಿ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಲು ಫೋನ್ ಕ್ಯಾಮೆರಾದಿಂದ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",`,
`    // Download Page (download.html)
    dl_badge: "ಗೂಗಲ್ ಪ್ಲೇನಲ್ಲಿ ಲೈವ್",
    dl_title: "ಅಧಿಕೃತ <br/><span>ಅಬ್ ತೋ ಘೂಮ್ ಲೇ</span> ಆಪ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    dl_sub: "ಭಾರತದ ಪ್ರಮುಖ ಗ್ರೂಪ್ ಟ್ರಾವೆಲ್ ಮತ್ತು ವೀಕೆಂಡ್ ಅಡ್ವೆಂಚರ್ ಆ್ಯಪ್ ಈಗ ಗೂಗಲ್ ಪ್ಲೇನಲ್ಲಿ ಲಭ್ಯವಿದೆ! ಬಸ್ ಲೈವ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ ಮತ್ತು ಆಫ್‌ಲೈನ್ ಪಾಸ್ ಪಡೆಯಿರಿ.",
    dl_btn_download: "ಗೂಗಲ್ ಪ್ಲೇನಲ್ಲಿ ಪಡೆಯಿರಿ 🚀",
    dl_qr_text: "ಗೂಗಲ್ ಪ್ಲೇನಲ್ಲಿ ತೆರೆಯಲು ಫೋನ್ ಕ್ಯಾಮೆರಾದಿಂದ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",`
);

code = code.replace(
`    // Additional Download Page Elements (kn)
    dl_badge_vip: "ಸೀಮಿತ ಆರಂಭಿಕ ಪ್ರವೇಶ — ವಿಐಪಿ ಕ್ಲಬ್",
    dl_hero_h1: "ನಿಮ್ಮ ಮುಂದಿನ ಸಾಹಸ<br/><span class=\\"yellow caveat\\">ಇಲ್ಲಿಂದಲೇ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ</span>",
    dl_hero_desc: "ಪ್ರಪಂಚಕ್ಕಿಂತ ಮುಂಚಿತವಾಗಿ ಈಗಲಾದರೂ ತಿರುಗಾಡು ಆ್ಯಪ್‌ನ ವಿಶೇಷ ಪ್ರವೇಶ ಪಡೆಯುವ ಅನ್ವೇಷಕರ ಸಮುದಾಯಕ್ಕೆ ಸೇರಿಕೊಳ್ಳಿ. ಸೀಮಿತ ಸಂಖ್ಯೆಯ ಸ್ಲಾಟ್‌ಗಳು ಮಾತ್ರ ಲಭ್ಯವಿವೆ.",
    dl_step1_label: "ಹಂತ ಒಂದು • ಪ್ರವೇಶವನ್ನು ಅನ್‌ಲಾಕ್ ಮಾಡಿ",
    dl_step1_title: "VIP ಪರೀಕ್ಷಕರ ಗುಂಪಿಗೆ ಸೇರಿ",
    dl_step1_desc: "Google Groups ತೆರೆಯುತ್ತದೆ. ನಿಮ್ಮ ಗೂಗಲ್ ಖಾತೆಯೊಂದಿಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ ಮತ್ತು \\"Join group\\" ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ. ಇದು ನಿಮ್ಮ ಪ್ಲೇ ಸ್ಟೋರ್ ಡೌನ್‌ಲೋಡ್ ಲಿಂಕ್ ಅನ್ನು ಅನ್‌ಲಾಕ್ ಮಾಡುತ್ತದೆ.",
    dl_step1_btn: "VIP ಕ್ಲಬ್‌ಗೆ ಸೇರಿ →",
    dl_step2_label: "ಹಂತ ಎರಡು • ಪರೀಕ್ಷಕರಾಗಿ",
    dl_step2_title: "ಪ್ಲೇ ಸ್ಟೋರ್‌ನಲ್ಲಿ \\"Become a Tester\\" ಕ್ಲಿಕ್ ಮಾಡಿ",
    dl_step2_desc: "Play Store ಪರೀಕ್ಷಾ ಪುಟ ತೆರೆಯುತ್ತದೆ. \\"Become a tester\\" ಬಟನ್ ಟ್ಯಾಪ್ ಮಾಡಿ — ನಂತರ ಕೆಳಗೆ ಕಾಣಿಸುವ \\"Download it on Google Play\\" ಅನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ.",
    dl_step2_btn: "🎯 ಪ್ಲೇ ಸ್ಟೋರ್ ಟೆಸ್ಟರ್ ಪುಟ ತೆರೆಯಿರಿ",
    dl_step3_label: "ಹಂತ ಮೂರು • ನೀವು ಸಿದ್ಧರಿದ್ದೀರಿ!",
    dl_step3_title: "ಸ್ಥಾಪಿಸಿ, ತೆರೆಯಿರಿ ಮತ್ತು ಅನ್ವೇಷಿಸಿ",
    dl_step3_desc: "ಆ್ಯಪ್ ಸಾಮಾನ್ಯ ಪ್ಲೇ ಸ್ಟೋರ್ ಆ್ಯಪ್‌ನಂತೆ ಇನ್‌ಸ್ಟಾಲ್ ಆಗುತ್ತದೆ. ಅದನ್ನು ತೆರೆಯಿರಿ, ಗ್ರೂಪ್ ಪ್ರವಾಸಗಳನ್ನು ಅನ್ವೇಷಿಸಿ ಮತ್ತು ನಿಮ್ಮ ಮುಂದಿನ ಸಾಹಸವನ್ನು ಬುಕ್ ಮಾಡಿ. ವಿಐಪಿ ಕ್ಲಬ್‌ಗೆ ಸುಸ್ವಾಗತ! 🎉",
    dl_pill_browse: "✅ ಟ್ರಿಪ್‌ಗಳನ್ನು ಬ್ರೌಸ್ ಮಾಡಿ",
    dl_pill_book: "✅ ತಕ್ಷಣ ಬುಕ್ ಮಾಡಿ",
    dl_pill_track: "✅ ಬಸ್ ಲೈವ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
    dl_important_note: "⚠️ ಮುಖ್ಯ: ಹಂತ 2 ಕಾರ್ಯನಿರ್ವಹಿಸುವ ಮೊದಲು ನೀವು ಹಂತ 1 (ಗುಂಪಿಗೆ ಸೇರುವುದು) ಪೂರ್ಣಗೊಳಿಸಬೇಕು. ಯಾವುದೇ ಸಮಸ್ಯೆಯಿದ್ದರೆ ನಮಗೆ ಇಮೇಲ್ ಮಾಡಿ:",`,
`    // Additional Download Page Elements (kn)
    dl_badge_vip: "ಅಧಿಕೃತ ಗೂಗಲ್ ಪ್ಲೇ ಬಿಡುಗಡೆ",
    dl_hero_h1: "ನಿಮ್ಮ ಮುಂದಿನ ಸಾಹಸ<br/>ಪ್ರಾರಂಭವಾಗುವುದು <span class=\\"yellow caveat\\">ಇಲ್ಲಿಂದಲೇ</span>",
    dl_hero_desc: "ಅಧಿಕೃತ ಅಬ್ ತೋ ಘೂಮ್ ಲೇ ಆಪ್ ಈಗ ಗೂಗಲ್ ಪ್ಲೇನಲ್ಲಿ ಲಭ್ಯವಿದೆ! ವಾರಾಂತ್ಯದ ಟ್ರೆಕ್‌ಗಳನ್ನು ಬುಕ್ ಮಾಡಲು ಮತ್ತು ಜಿಪಿಎಸ್ ಮೂಲಕ ಬಸ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಲು ಈಗಲೇ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ.",
    dl_step1_label: "ಅಧಿಕೃತ ಆಂಡ್ರಾಯ್ಡ್ ಆಪ್",
    dl_step1_title: "ಗೂಗಲ್ ಪ್ಲೇ ಸ್ಟೋರ್‌ನಿಂದ ಪಡೆಯಿರಿ",
    dl_step1_desc: "ಒಂದೇ ಕ್ಲಿಕ್‌ನಲ್ಲಿ ಗೂಗಲ್ ಪ್ಲೇ ಸ್ಟೋರ್‌ನಿಂದ ನೇರವಾಗಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ. ಗೂಗಲ್ ಪ್ಲೇ ಪ್ರೊಟೆಕ್ಟ್‌ನಿಂದ ೧೦೦% ಸುರಕ್ಷಿತ.",
    dl_step1_btn: "⬇️ ಗೂಗಲ್ ಪ್ಲೇನಲ್ಲಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ →",
    dl_step2_label: "ವೇಗದ ಮೊಬೈಲ್ ಪ್ರವೇಶ",
    dl_step2_title: "ಮೊಬೈಲ್‌ನಲ್ಲಿ ಕ್ಯೂಆರ್ ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
    dl_step2_desc: "ನಿಮ್ಮ ಫೋನ್ ಕ್ಯಾಮೆರಾದಿಂದ ಕ್ಯೂಆರ್ ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಮತ್ತು ಪ್ಲೇ ಸ್ಟೋರ್ ಲಿಸ್ಟಿಂಗ್ ಅನ್ನು ನೇರವಾಗಿ ತೆರೆಯಿರಿ.",
    dl_step2_btn: "📱 ಪ್ಲೇ ಸ್ಟೋರ್ ಲಿಸ್ಟಿಂಗ್ ತೆರೆಯಿರಿ",
    dl_step3_label: "ಪ್ರಯಾಣಕ್ಕೆ ಸಿದ್ಧರಾಗಿ",
    dl_step3_title: "ಸ್ಥಾಪಿಸಿ ಮತ್ತು ಪ್ರಯಾಣ ಪ್ರಾರಂಭಿಸಿ",
    dl_step3_desc: "ಕೆಲವೇ ಕ್ಷಣಗಳಲ್ಲಿ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿ ಮತ್ತು ಶೂನ್ಯ ಕಮಿಷನ್‌ನೊಂದಿಗೆ ನಿಮ್ಮ ಸಾಹಸಯಾತ್ರೆಯನ್ನು ಬುಕ್ ಮಾಡಿ! 🎉",
    dl_pill_browse: "✅ ಟ್ರಿಪ್‌ಗಳನ್ನು ಬ್ರೌಸ್ ಮಾಡಿ",
    dl_pill_book: "✅ ತಕ್ಷಣ ಬುಕ್ ಮಾಡಿ",
    dl_pill_track: "✅ ಬಸ್ ಲೈವ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
    dl_important_note: "ನೇರ ಎಪಿಕೆ ಅಥವಾ ಸಹಾಯಕ್ಕಾಗಿ ನಮಗೆ ಇಮೇಲ್ ಮಾಡಿ:",`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated web/i18n.js with Play Store production announcement across 4 languages!');
