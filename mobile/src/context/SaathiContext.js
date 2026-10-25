import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Alert, Platform, AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as API from '../api';
import '../utlis/notificationHandler';
import { syncRoutineReminders, clearRoutineReminders } from '../utlis/routineReminders';
import { syncMedicineReminders } from '../utlis/medicineReminders';
const Ctx = createContext(null);
export const useSaathi = () => useContext(Ctx);
export const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const translations = {
  mr: {
    'Please enter your name.':'कृपया तुमचे नाव टाका.',
    'Enter the 6-digit code.':'६ अंकी कोड टाका.',
    'Use at least 8 characters for your new password.':'नवीन पासवर्ड किमान ८ अक्षरांचा असावा.',
    'Enter a valid email address.':'वैध ईमेल पत्ता टाका.',
    'Use at least 8 characters for your password.':'पासवर्ड किमान ८ अक्षरांचा असावा.',
    'Passwords do not match.':'पासवर्ड जुळत नाहीत.',
    'Could not send the verification code.':'पडताळणी कोड पाठवता आला नाही.',
    'Enter the 6-digit code sent to your email.':'ईमेलवर पाठवलेला ६ अंकी कोड टाका.',
    'Verification failed. Please try again.':'पडताळणी अयशस्वी झाली. पुन्हा प्रयत्न करा.',
    'Login failed. Please try again.':'लॉग इन अयशस्वी झाले. पुन्हा प्रयत्न करा.',
    'Enter your registered email to receive a reset code.':'रीसेट कोड मिळवण्यासाठी नोंदणीकृत ईमेल टाका.',
    'Enter the code from your email and choose a new password.':'ईमेलमधील कोड टाका आणि नवीन पासवर्ड निवडा.',
    '6-digit verification code':'६ अंकी पडताळणी कोड','New password':'नवीन पासवर्ड','Confirm new password':'नवीन पासवर्डची पुष्टी करा',
    'Back to Log In':'लॉग इनकडे परत जा','Could not request a reset code.':'रीसेट कोड मागवता आला नाही.',
    'Could not reset your password.':'पासवर्ड रीसेट करता आला नाही.',
    'Password reset successfully. Please log in with your new password.':'पासवर्ड रीसेट झाला. नवीन पासवर्डने लॉग इन करा.',

    'Language':'भाषा','Choose your language':'तुमची भाषा निवडा','Continue':'पुढे चला','Back':'मागे',
    'Login':'लॉग इन','Log In':'लॉग इन','Sign Up':'नोंदणी करा','Create Account':'खाते तयार करा',
    'Verify Email':'ईमेल सत्यापित करा','Forgot password?':'पासवर्ड विसरलात?','New here? Sign up':'नवीन आहात? नोंदणी करा',
    'Already have an account? Log in':'आधीच खाते आहे? लॉग इन करा','Email':'ईमेल','Password':'पासवर्ड',
    'Confirm password':'पासवर्डची पुष्टी करा','Full name':'पूर्ण नाव','Your Profile':'तुमची प्रोफाइल',
    'Daily Routine':'दैनंदिन दिनक्रम','Medicines':'औषधे','Emergency Contacts':'आपत्कालीन संपर्क',
    'Save':'जतन करा','Edit':'संपादित करा','Remove':'काढून टाका','Cancel':'रद्द करा',
    'Add activity':'क्रिया जोडा','Add medicine':'औषध जोडा','No activities yet. Tap below to add one.':'अजून क्रिया नाहीत. जोडण्यासाठी खाली टॅप करा.',
    'No medicines yet. Tap below to add one.':'अजून औषधे नाहीत. जोडण्यासाठी खाली टॅप करा.',
    'Activity name':'क्रियेचे नाव','Category':'प्रकार','Scheduled time':'नियोजित वेळ','Repeat days':'पुनरावृत्तीचे दिवस',
    'Medicine name':'औषधाचे नाव','Dosage as prescribed':'डॉक्टरांनी सांगितलेला डोस','Time(s)':'वेळा','Start date':'सुरुवातीची तारीख',
    'End date (optional)':'शेवटची तारीख (ऐच्छिक)','Instructions (optional)':'सूचना (ऐच्छिक)',
    'Primary contact name':'प्राथमिक संपर्काचे नाव','Relationship':'नाते','Primary phone':'प्राथमिक फोन',
    'Secondary contact name (optional)':'दुय्यम संपर्काचे नाव (ऐच्छिक)','Secondary phone (optional)':'दुय्यम फोन (ऐच्छिक)',
    'Preferred language':'पसंतीची भाषा','Marathi':'मराठी','Hindi':'हिंदी','English':'इंग्रजी',
    'What Saathi does':'साथी काय करते','How it works':'हे कसे कार्य करते','Get Started':'सुरू करा',
    'Your AI Companion for Safer, Independent Living.':'सुरक्षित आणि स्वतंत्र जीवनासाठी तुमचा AI साथी.',
    'Forgot Password':'पासवर्ड विसरलात','Send Reset Code':'रीसेट कोड पाठवा','Reset Password':'पासवर्ड रीसेट करा',
    'Email verification code':'ईमेल पडताळणी कोड','Send Verification Code':'पडताळणी कोड पाठवा','Verify & Create Account':'पडताळा आणि खाते तयार करा',
    'Create your personal Saathi account.':'तुमचे वैयक्तिक साथी खाते तयार करा.',
    'Sign in to open your Saathi dashboard.':'साथी डॅशबोर्ड उघडण्यासाठी लॉग इन करा.',
    'Log in using your registered Saathi account.':'तुमच्या नोंदणीकृत साथी खात्याने लॉग इन करा.',
    'Tap to select time':'वेळ निवडण्यासाठी टॅप करा','Select date':'तारीख निवडा','Remove last time':'शेवटची वेळ काढा',
    'Name is required':'नाव आवश्यक आहे','Phone number is required':'फोन नंबर आवश्यक आहे',
    'Meal':'जेवण','Exercise':'व्यायाम','Appointment':'भेटीची वेळ','Sleep':'झोप','Other':'इतर',
    'Mon':'सोम','Tue':'मंगळ','Wed':'बुध','Thu':'गुरु','Fri':'शुक्र','Sat':'शनि','Sun':'रवि',
    'Log out':'लॉग आउट','Hello,':'नमस्कार,','Language:':'भाषा:',
    'Change email or account details':'ईमेल किंवा खाते तपशील बदला',
    'Log in using your registered Saathi account.':'तुमच्या नोंदणीकृत साथी खात्याने लॉग इन करा.',
    'Please wait...':'कृपया थांबा...','Enter your email and password.':'ईमेल आणि पासवर्ड टाका.',
    'Forgot password?':'पासवर्ड विसरलात?','New here? Sign up':'नवीन आहात? नोंदणी करा',
    'Logging in...':'लॉग इन होत आहे...','Could not load your saved data.':'तुमचा जतन केलेला डेटा लोड करता आला नाही.',
    'Family / Caregiver Dashboard':'कुटुंब / काळजीवाहू डॅशबोर्ड',
    'A caring companion for daily routines, medicine schedules and staying connected with family.':'दैनंदिन दिनक्रम, औषधांच्या वेळा आणि कुटुंबाशी संपर्कासाठी काळजी घेणारा साथी.','Already have an account? Use Login in the top bar.':'आधीच खाते आहे? वर लॉग इन निवडा.',

    'Choose a language for the app. You can change it later.':'अॅपसाठी भाषा निवडा. तुम्ही ती नंतर बदलू शकता.',
    'No completion records for this day.':'या दिवसासाठी पूर्णत्वाची नोंद नाही.','Routine':'दिनक्रम','Medicine':'औषध','Time not recorded':'वेळ नोंदवलेली नाही','Confirmed':'पुष्टी झाली','Not done':'पूर्ण झाले नाही','of':'पैकी','tasks completed':'कामे पूर्ण झाली',
    'Family Care':'कुटुंबाची काळजी',
    "Only linked caregivers can view an elder's care information.":'फक्त जोडलेले काळजीवाहक ज्येष्ठांची काळजीविषयक माहिती पाहू शकतात.',
    'Accept an invitation':'आमंत्रण स्वीकारा',
    'Use a separate caregiver Saathi account. The elderly user must first generate a code from their account.':'काळजीवाहकासाठी स्वतंत्र साथी खाते वापरा. ज्येष्ठ वापरकर्त्याने आधी त्यांच्या खात्यातून कोड तयार करावा.',
    '8-digit invitation code':'८ अंकी आमंत्रण कोड',
    'Accept invitation':'आमंत्रण स्वीकारा',
    'One-time invite code':'एकदाच वापरण्याचा आमंत्रण कोड',
    'Share this code privately with your trusted caregiver. It expires in 24 hours.':'हा कोड तुमच्या विश्वासू काळजीवाहकाशी खाजगीपणे शेअर करा. तो २४ तासांत कालबाह्य होईल.',
    'Share privately with your trusted caregiver. Expires in 24 hours.':'तुमच्या विश्वासू काळजीवाहकाशी खाजगीपणे शेअर करा. २४ तासांत कालबाह्य होईल.',
    'Invitation created':'आमंत्रण तयार झाले',
    'Linked successfully':'यशस्वीरीत्या जोडले',
    'Caregiver access is active.':'काळजीवाहकाचा प्रवेश सक्रिय आहे.',
    'Invite your caregiver':'तुमच्या काळजीवाहकाला आमंत्रित करा',
    'Use this while signed in as the elderly user. The family member accepts the code from their own account.':'ज्येष्ठ वापरकर्त्याच्या खात्यात लॉग इन असताना हे वापरा. कुटुंबातील सदस्य स्वतःच्या खात्यातून कोड स्वीकारेल.',
    'Generate one-time code':'एकदाच वापरण्याचा कोड तयार करा',
    'Linked caregivers':'जोडलेले काळजीवाहक',
    'No caregivers linked to your profile yet.':'तुमच्या प्रोफाइलशी अजून कोणताही काळजीवाहक जोडलेला नाही.',
    'Access to your care information':'तुमच्या काळजीविषयक माहितीचा प्रवेश',
    'Remove caregiver access':'काळजीवाहकाचा प्रवेश काढा',
    'Remove caregiver?':'काळजीवाहकाचा प्रवेश काढायचा?',
    'Remove access':'प्रवेश काढा',
    'Cancel':'रद्द करा',
    'Remove {name}’s access to your care information?':'तुमच्या काळजीविषयक माहितीचा {name} यांचा प्रवेश काढायचा?',
    'Access removed':'प्रवेश काढला',
    'The caregiver can no longer access your linked care profile.':'काळजीवाहक आता तुमच्या जोडलेल्या काळजी प्रोफाइलमध्ये प्रवेश करू शकणार नाही.',
    'Linked care profiles':'जोडलेली काळजी प्रोफाइल',
    "No linked profiles yet. Accept an invitation from an elderly user's account first.":'अजून कोणतीही प्रोफाइल जोडलेली नाही. आधी ज्येष्ठ वापरकर्त्याच्या खात्यातून आलेले आमंत्रण स्वीकारा.',
    'Saathi profile':'साथी प्रोफाइल',
    'daily care':'दैनंदिन काळजी',
    'Date:':'तारीख:',
    'Routines':'दिनक्रम',
    'reported complete':'पूर्ण झाल्याची नोंद',
    'Medicine doses':'औषधांचे डोस',
    'reported taken':'घेतल्याची नोंद',
    "Today's routines":'आजचा दिनक्रम',
    'No routines configured.':'दिनक्रम सेट केलेला नाही.',
    'Reported complete':'पूर्ण झाल्याची नोंद',
    'No completion recorded':'पूर्ण झाल्याची नोंद नाही.',
    'Medicines':'औषधे',
    'No medicines configured.':'औषधे सेट केलेली नाहीत.',
    'User reported taken':'वापरकर्त्याने औषध घेतल्याची नोंद केली',
    'No confirmation recorded':'पुष्टीची नोंद नाही.',
    'Emergency contacts':'आपत्कालीन संपर्क',
    'Doctor:':'डॉक्टर:',
    'No emergency contacts saved.':'आपत्कालीन संपर्क जतन केलेले नाहीत.',
    'Close care details':'काळजीचे तपशील बंद करा',
    'Could not load caregiver data.':'काळजीवाहकाची माहिती लोड करता आली नाही.',
    'Something went wrong.':'काहीतरी चूक झाली.',
    'Could not remove access.':'प्रवेश काढता आला नाही.',
    'Completion history':'पूर्णत्वाचा इतिहास',
    'No completion history yet.':'अजून पूर्णत्वाचा इतिहास नाही.',
    "Today's progress":'आजची प्रगती',
    'complete':'पूर्ण',
    'Age':'वय',
    'Step 1 of 5':'टप्पा १ पैकी ५',
    'Step 2 of 5':'टप्पा २ पैकी ५',
    'Step 3 of 5':'टप्पा ३ पैकी ५',
    'Step 4 of 5':'टप्पा ४ पैकी ५',
    'Step 5 of 5':'टप्पा ५ पैकी ५',
    'Tell us a little about you.':'तुमच्याबद्दल थोडी माहिती द्या.',
    'Age or date of birth':'वय किंवा जन्मतारीख',
    'e.g. Son':'उदा. मुलगा',
    'In a real emergency, call 112.':'खऱ्या आपत्कालीन परिस्थितीत ११२ वर कॉल करा.',
    'Prototype only: no calls or messages are made.':'हे प्रोटोटाइप आहे: कॉल किंवा संदेश पाठवले जात नाहीत.',
    'Could not save contacts':'संपर्क जतन करता आले नाहीत',
    'Could not save profile':'प्रोफाइल जतन करता आली नाही.',
    'Review Setup':'सेटअप तपासा',
    'Check everything before you finish.':'पूर्ण करण्यापूर्वी सर्व माहिती तपासा.',
    'Finish Setup':'सेटअप पूर्ण करा',
    'Profile':'प्रोफाइल',
    'None added':'काहीही जोडलेले नाही',
    'Phone:':'फोन:',
    'Conditions:':'आजार/स्थिती:',
    'Saving...':'जतन होत आहे...',
    'Create Profile':'प्रोफाइल तयार करा',
    'I have taken it':'मी औषध घेतले आहे',
    'Unable to call':'कॉल करता आला नाही',
    'Please dial 112 manually.':'कृपया ११२ नंबर स्वतः डायल करा.',
    'Please dial the contact manually.':'कृपया संपर्क क्रमांक स्वतः डायल करा.',
    'SOS': 'आपत्कालीन मदत',
'Profile': 'प्रोफाइल',
'Contacts': 'संपर्क',
"Today's routine": 'आजचा दिनक्रम',
'Wake up': 'उठणे',
'Food': 'जेवण',
'Play': 'खेळणे',
'Routines:': 'दिनक्रम:',
'completed': 'पूर्ण',
'SOS emergency': 'आपत्कालीन मदत',
'Create your profile first': 'प्रथम तुमची प्रोफाइल तयार करा',
'Welcome to Saathi! Add your profile details to personalize your routines and care dashboard.': 'साथीमध्ये तुमचे स्वागत आहे! तुमचा दिनक्रम आणि काळजी डॅशबोर्ड वैयक्तिक करण्यासाठी प्रोफाइलची माहिती भरा.',
'completed': 'पूर्ण',
'Routines:': 'दिनक्रम:',
'Confirmed': 'पुष्टी झाली',
'Medicines:': 'औषधे:',
'No routine yet. Use the Routine shortcut to add one.': 'अजून दिनक्रम नाही. जोडण्यासाठी दिनक्रम पर्याय वापरा.',
'No medicines yet. Use the Medicines shortcut to add one.': 'अजून औषधे नाहीत. जोडण्यासाठी औषधे पर्याय वापरा.',
'Confirmed at': 'या वेळी पुष्टी झाली',
'friend': 'मित्रा',
'Missed': 'राहून गेले',
'Too early': 'अजून वेळ झालेली नाही',
'You can confirm this medicine at': 'तुम्ही या वेळी औषधाची पुष्टी करू शकता:',
'Unable to confirm': 'पुष्टी करता आली नाही',
'This medicine has no database ID. Please reload your medicines.':
  'या औषधाचा डेटाबेस ID नाही. कृपया औषधांची माहिती पुन्हा लोड करा.',
'Could not save routine': 'दिनक्रम जतन करता आला नाही',
'Please try again.': 'कृपया पुन्हा प्रयत्न करा.',
'Your medicine confirmation was saved.': 'औषध घेतल्याची पुष्टी जतन झाली.',
'Could not save confirmation': 'पुष्टी जतन करता आली नाही',
'Not yet due': 'अजून वेळ झालेली नाही',
'Confirm late': 'उशिराची पुष्टी करा',
'of': 'पैकी',
'done': 'पूर्ण',
'confirmed': 'पुष्टी झाली',
'primary contact': 'प्राथमिक संपर्क',
'Call': 'कॉल करा',
'Call backup contact': 'पर्यायी संपर्काला कॉल करा',
'Choose how you want to contact someone.': 'तुम्हाला कोणाशी संपर्क साधायचा आहे ते निवडा.',
'Call emergency number 112': 'आपत्कालीन क्रमांक ११२ वर कॉल करा',
'Medicine reminders': 'औषधांची आठवण',
'Keep track of scheduled medicines': 'औषधांच्या ठरलेल्या वेळांची माहिती ठेवा',
'Daily routines': 'दैनंदिन दिनक्रम',
'Meals, walks and appointments': 'जेवण, चालणे आणि भेटी',
'Voice assistance': 'आवाजाद्वारे सहाय्य',
'Simple, accessible interaction': 'सोप्या पद्धतीने संवाद साधा',
'Emergency help': 'आपत्कालीन मदत',
'Quick access to emergency contacts': 'आपत्कालीन संपर्कांशी त्वरित संपर्क साधा',
'Health profile': 'आरोग्य प्रोफाइल',
'Important care details in one place': 'काळजीसाठी आवश्यक माहिती एकाच ठिकाणी',
'Family connection': 'कुटुंबाशी जोडणी',
'Help loved ones stay informed': 'आपल्या प्रियजनांना माहिती मिळत राहू द्या',

'Create your personal profile': 'तुमची वैयक्तिक प्रोफाइल तयार करा',
'Add routines, medicines and emergency contacts': 'दिनक्रम, औषधे आणि आपत्कालीन संपर्क जोडा',
'Confirm completed activities in your dashboard': 'डॅशबोर्डवर पूर्ण केलेल्या कामांची पुष्टी करा',
'Review daily progress at a glance': 'दिवसभरातील प्रगती एका नजरेत पाहा',
  },
  hi: {
    'Please enter your name.':'कृपया अपना नाम दर्ज करें।',
    'Enter the 6-digit code.':'6 अंकों का कोड दर्ज करें।',
    'Use at least 8 characters for your new password.':'नया पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।',
    'Enter a valid email address.':'मान्य ईमेल पता दर्ज करें।',
    'Use at least 8 characters for your password.':'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।',
    'Passwords do not match.':'पासवर्ड मेल नहीं खाते।',
    'Could not send the verification code.':'सत्यापन कोड नहीं भेजा जा सका।',
    'Enter the 6-digit code sent to your email.':'ईमेल पर भेजा गया 6 अंकों का कोड दर्ज करें।',
    'Verification failed. Please try again.':'सत्यापन विफल हुआ। फिर कोशिश करें।',
    'Login failed. Please try again.':'लॉग इन विफल हुआ। फिर कोशिश करें।',
    'Enter your registered email to receive a reset code.':'रीसेट कोड पाने के लिए पंजीकृत ईमेल दर्ज करें।',
    'Enter the code from your email and choose a new password.':'ईमेल का कोड दर्ज करें और नया पासवर्ड चुनें।',
    '6-digit verification code':'6 अंकों का सत्यापन कोड','New password':'नया पासवर्ड','Confirm new password':'नए पासवर्ड की पुष्टि करें',
    'Back to Log In':'लॉग इन पर वापस जाएँ','Could not request a reset code.':'रीसेट कोड का अनुरोध नहीं हो सका।',
    'Could not reset your password.':'पासवर्ड रीसेट नहीं हो सका।',
    'Password reset successfully. Please log in with your new password.':'पासवर्ड रीसेट हो गया। नए पासवर्ड से लॉग इन करें।',

    'Language':'भाषा','Choose your language':'अपनी भाषा चुनें','Continue':'जारी रखें','Back':'वापस',
    'Login':'लॉग इन','Log In':'लॉग इन','Sign Up':'साइन अप','Create Account':'खाता बनाएँ',
    'Verify Email':'ईमेल सत्यापित करें','Forgot password?':'पासवर्ड भूल गए?','New here? Sign up':'नए हैं? साइन अप करें',
    'Already have an account? Log in':'पहले से खाता है? लॉग इन करें','Email':'ईमेल','Password':'पासवर्ड',
    'Confirm password':'पासवर्ड की पुष्टि करें','Full name':'पूरा नाम','Your Profile':'आपकी प्रोफ़ाइल',
    'Daily Routine':'दैनिक दिनचर्या','Medicines':'दवाइयाँ','Emergency Contacts':'आपातकालीन संपर्क',
    'Save':'सेव करें','Edit':'संपादित करें','Remove':'हटाएँ','Cancel':'रद्द करें',
    'Add activity':'गतिविधि जोड़ें','Add medicine':'दवा जोड़ें','No activities yet. Tap below to add one.':'अभी कोई गतिविधि नहीं है। जोड़ने के लिए नीचे टैप करें।',
    'No medicines yet. Tap below to add one.':'अभी कोई दवा नहीं है। जोड़ने के लिए नीचे टैप करें।',
    'Activity name':'गतिविधि का नाम','Category':'श्रेणी','Scheduled time':'निर्धारित समय','Repeat days':'दोहराने के दिन',
    'Medicine name':'दवा का नाम','Dosage as prescribed':'डॉक्टर द्वारा बताई गई खुराक','Time(s)':'समय','Start date':'शुरू होने की तारीख',
    'End date (optional)':'अंतिम तारीख (वैकल्पिक)','Instructions (optional)':'निर्देश (वैकल्पिक)',
    'Primary contact name':'प्राथमिक संपर्क का नाम','Relationship':'रिश्ता','Primary phone':'प्राथमिक फ़ोन',
    'Secondary contact name (optional)':'दूसरे संपर्क का नाम (वैकल्पिक)','Secondary phone (optional)':'दूसरा फ़ोन (वैकल्पिक)',
    'Preferred language':'पसंदीदा भाषा','Marathi':'मराठी','Hindi':'हिंदी','English':'अंग्रेज़ी',
    'What Saathi does':'साथी क्या करता है','How it works':'यह कैसे काम करता है','Get Started':'शुरू करें',
    'Your AI Companion for Safer, Independent Living.':'सुरक्षित और स्वतंत्र जीवन के लिए आपका AI साथी।',
    'Forgot Password':'पासवर्ड भूल गए','Send Reset Code':'रीसेट कोड भेजें','Reset Password':'पासवर्ड रीसेट करें',
    'Email verification code':'ईमेल सत्यापन कोड','Send Verification Code':'सत्यापन कोड भेजें','Verify & Create Account':'सत्यापित करें और खाता बनाएँ',
    'Create your personal Saathi account.':'अपना व्यक्तिगत साथी खाता बनाएँ।',
    'Sign in to open your Saathi dashboard.':'साथी डैशबोर्ड खोलने के लिए लॉग इन करें।',
    'Log in using your registered Saathi account.':'अपने पंजीकृत साथी खाते से लॉग इन करें।',
    'Tap to select time':'समय चुनने के लिए टैप करें','Select date':'तारीख चुनें','Remove last time':'अंतिम समय हटाएँ',
    'Name is required':'नाम आवश्यक है','Phone number is required':'फ़ोन नंबर आवश्यक है',
    'Meal':'भोजन','Exercise':'व्यायाम','Appointment':'अपॉइंटमेंट','Sleep':'नींद','Other':'अन्य',
    'Mon':'सोम','Tue':'मंगल','Wed':'बुध','Thu':'गुरु','Fri':'शुक्र','Sat':'शनि','Sun':'रवि',
    'Log out':'लॉग आउट','Hello,':'नमस्ते,','Language:':'भाषा:',
    'Change email or account details':'ईमेल या खाते की जानकारी बदलें',
    'Log in using your registered Saathi account.':'अपने पंजीकृत साथी खाते से लॉग इन करें।',
    'Please wait...':'कृपया प्रतीक्षा करें...','Enter your email and password.':'अपना ईमेल और पासवर्ड दर्ज करें।',
    'Forgot password?':'पासवर्ड भूल गए?','New here? Sign up':'नए हैं? साइन अप करें',
    'Logging in...':'लॉग इन हो रहा है...','Could not load your saved data.':'आपका सेव किया गया डेटा लोड नहीं हो सका।',
    'Family / Caregiver Dashboard':'परिवार / देखभालकर्ता डैशबोर्ड',
    'A caring companion for daily routines, medicine schedules and staying connected with family.':'दैनिक दिनचर्या, दवाइयों और परिवार से जुड़े रहने में मदद करने वाला साथी।','Already have an account? Use Login in the top bar.':'पहले से खाता है? ऊपर लॉग इन चुनें.',

    'Choose a language for the app. You can change it later.':'ऐप की भाषा चुनें। आप इसे बाद में बदल सकते हैं।',
    'No completion records for this day.':'इस दिन का कोई पूरा होने का रिकॉर्ड नहीं है।','Routine':'दिनचर्या','Medicine':'दवा','Time not recorded':'समय दर्ज नहीं है','Confirmed':'पुष्टि हुई','Not done':'पूरा नहीं हुआ','of':'में से','tasks completed':'काम पूरे हुए',
    'Family Care':'परिवार की देखभाल',
    "Only linked caregivers can view an elder's care information.":'केवल जुड़े हुए देखभालकर्ता बुज़ुर्ग की देखभाल की जानकारी देख सकते हैं।',
    'Accept an invitation':'निमंत्रण स्वीकार करें',
    'Use a separate caregiver Saathi account. The elderly user must first generate a code from their account.':'देखभालकर्ता के लिए अलग साथी खाता इस्तेमाल करें। बुज़ुर्ग उपयोगकर्ता को पहले अपने खाते से कोड बनाना होगा।',
    '8-digit invitation code':'8 अंकों का निमंत्रण कोड',
    'Accept invitation':'निमंत्रण स्वीकार करें',
    'One-time invite code':'एक बार इस्तेमाल होने वाला कोड',
    'Share this code privately with your trusted caregiver. It expires in 24 hours.':'यह कोड अपने भरोसेमंद देखभालकर्ता के साथ निजी तौर पर साझा करें। यह 24 घंटे में समाप्त हो जाएगा।',
    'Share privately with your trusted caregiver. Expires in 24 hours.':'अपने भरोसेमंद देखभालकर्ता के साथ निजी तौर पर साझा करें। 24 घंटे में समाप्त होगा।',
    'Invitation created':'निमंत्रण बनाया गया',
    'Linked successfully':'सफलतापूर्वक जुड़ गया',
    'Caregiver access is active.':'देखभालकर्ता की पहुँच सक्रिय है.',
    'Invite your caregiver':'अपने देखभालकर्ता को आमंत्रित करें',
    'Use this while signed in as the elderly user. The family member accepts the code from their own account.':'बुज़ुर्ग उपयोगकर्ता के खाते में लॉग इन रहते हुए इसका उपयोग करें। परिवार का सदस्य अपने खाते से कोड स्वीकार करेगा।',
    'Generate one-time code':'एक बार इस्तेमाल होने वाला कोड बनाएँ',
    'Linked caregivers':'जुड़े हुए देखभालकर्ता',
    'No caregivers linked to your profile yet.':'अभी तक आपकी प्रोफ़ाइल से कोई देखभालकर्ता नहीं जुड़ा है।',
    'Access to your care information':'आपकी देखभाल की जानकारी तक पहुँच',
    'Remove caregiver access':'देखभालकर्ता की पहुँच हटाएँ',
    'Remove caregiver?':'देखभालकर्ता की पहुँच हटाएँ?',
    'Remove access':'पहुँच हटाएँ',
    'Cancel':'रद्द करें',
    'Access removed':'पहुँच हटा दी गई',
    'The caregiver can no longer access your linked care profile.':'देखभालकर्ता अब आपकी जुड़ी हुई देखभाल प्रोफ़ाइल नहीं देख सकता।',
    'Linked care profiles':'जुड़ी हुई देखभाल प्रोफ़ाइलें',
    "No linked profiles yet. Accept an invitation from an elderly user's account first.":'अभी कोई प्रोफ़ाइल नहीं जुड़ी है। पहले बुज़ुर्ग उपयोगकर्ता के खाते से निमंत्रण स्वीकार करें।',
    'Saathi profile':'साथी प्रोफ़ाइल',
    'daily care':'दैनिक देखभाल',
    'Date:':'तारीख:',
    'Routines':'दिनचर्या',
    'reported complete':'पूरा होने की सूचना',
    'Medicine doses':'दवा की खुराक',
    'reported taken':'लेने की सूचना',
    "Today's routines":'आज की दिनचर्या',
    'No routines configured.':'कोई दिनचर्या सेट नहीं है।',
    'Reported complete':'पूरा होने की सूचना',
    'No completion recorded':'पूरा होने का रिकॉर्ड नहीं है।',
    'Medicines':'दवाइयाँ',
    'No medicines configured.':'कोई दवा सेट नहीं है।',
    'User reported taken':'उपयोगकर्ता ने दवा लेने की सूचना दी',
    'No confirmation recorded':'पुष्टि का रिकॉर्ड नहीं है।',
    'Emergency contacts':'आपातकालीन संपर्क',
    'Doctor:':'डॉक्टर:',
    'No emergency contacts saved.':'आपातकालीन संपर्क सेव नहीं हैं।',
    'Close care details':'देखभाल का विवरण बंद करें',
    'Could not load caregiver data.':'देखभालकर्ता की जानकारी लोड नहीं हो सकी।',
    'Something went wrong.':'कुछ गलत हो गया।',
    'Could not remove access.':'पहुँच नहीं हटाई जा सकी।',
    'Completion history':'पूरा करने का इतिहास',
    'No completion history yet.':'अभी तक पूरा करने का इतिहास नहीं है।',
    "Today's progress":'आज की प्रगति',
    'complete':'पूरा',
    'Age':'उम्र',
    'Step 1 of 5':'चरण 1 / 5',
    'Step 2 of 5':'चरण 2 / 5',
    'Step 3 of 5':'चरण 3 / 5',
    'Step 4 of 5':'चरण 4 / 5',
    'Step 5 of 5':'चरण 5 / 5',
    'Tell us a little about you.':'अपने बारे में थोड़ी जानकारी दें।',
    'Age or date of birth':'उम्र या जन्मतिथि',
    'e.g. Son':'जैसे बेटा',
    'In a real emergency, call 112.':'वास्तविक आपात स्थिति में 112 पर कॉल करें।',
    'Prototype only: no calls or messages are made.':'यह केवल प्रोटोटाइप है: कोई कॉल या संदेश नहीं भेजा जाता।',
    'Could not save contacts':'संपर्क सेव नहीं हो सके',
    'Could not save profile':'प्रोफ़ाइल सेव नहीं हो सकी।',
    'Review Setup':'सेटअप की समीक्षा करें',
    'Check everything before you finish.':'पूरा करने से पहले सब कुछ जाँचें।',
    'Finish Setup':'सेटअप पूरा करें',
    'Profile':'प्रोफ़ाइल',
    'None added':'कुछ नहीं जोड़ा गया',
    'Phone:':'फ़ोन:',
    'Conditions:':'स्थितियाँ:',
    'Saving...':'सेव हो रहा है...',
    'Create Profile':'प्रोफ़ाइल बनाएँ',
    'I have taken it':'मैंने दवा ले ली है',
    'Unable to call':'कॉल नहीं हो सकी',
    'Please dial 112 manually.':'कृपया 112 नंबर स्वयं डायल करें।',
    'Please dial the contact manually.':'कृपया संपर्क नंबर स्वयं डायल करें.',
    'SOS': 'आपातकालीन सहायता',
'Profile': 'प्रोफ़ाइल',
'Contacts': 'संपर्क',
"Today's routine": 'आज की दिनचर्या',
'Wake up': 'जागना',
'Food': 'भोजन',
'Play': 'खेलना',
'Routines:': 'दिनचर्या:',
'completed': 'पूरा',
'SOS emergency': 'आपातकालीन सहायता',
'Create your profile first': 'पहले अपनी प्रोफ़ाइल बनाएँ',
'Welcome to Saathi! Add your profile details to personalize your routines and care dashboard.': 'साथी में आपका स्वागत है! अपनी दिनचर्या और देखभाल डैशबोर्ड को व्यक्तिगत बनाने के लिए प्रोफ़ाइल की जानकारी भरें।',
'completed': 'पूरे हुए',
'Routines:': 'दिनचर्या:',
'Confirmed': 'पुष्टि हुई',
'Medicines:': 'दवाइयाँ:',
'No routine yet. Use the Routine shortcut to add one.': 'अभी कोई दिनचर्या नहीं है। जोड़ने के लिए दिनचर्या विकल्प का उपयोग करें।',
'No medicines yet. Use the Medicines shortcut to add one.': 'अभी कोई दवा नहीं है। जोड़ने के लिए दवाइयाँ विकल्प का उपयोग करें।',
'Confirmed at': 'इस समय पुष्टि हुई',
'friend': 'मित्र',
'Missed': 'छूट गया',
'Too early': 'अभी समय नहीं हुआ है',
'You can confirm this medicine at': 'आप इस समय दवा की पुष्टि कर सकते हैं:',
'Unable to confirm': 'पुष्टि नहीं हो सकी',
'This medicine has no database ID. Please reload your medicines.':
  'इस दवा की डेटाबेस ID नहीं है। कृपया दवाइयों को फिर से लोड करें।',
'Could not save routine': 'दिनचर्या सेव नहीं हो सकी',
'Please try again.': 'कृपया फिर से कोशिश करें।',
'Your medicine confirmation was saved.': 'दवा लेने की पुष्टि सेव हो गई।',
'Could not save confirmation': 'पुष्टि सेव नहीं हो सकी',
'Not yet due': 'अभी समय नहीं हुआ है',
'Confirm late': 'देर से पुष्टि करें',
'of': 'में से',
'done': 'पूरा',
'confirmed': 'पुष्टि हुई',
'primary contact': 'प्राथमिक संपर्क',
'Call': 'कॉल करें',
'Call backup contact': 'वैकल्पिक संपर्क को कॉल करें',
'Choose how you want to contact someone.': 'चुनें कि आप किससे संपर्क करना चाहते हैं।',
'Call emergency number 112': 'आपातकालीन नंबर 112 पर कॉल करें',
'Medicine reminders': 'दवा की याद दिलाना',
'Keep track of scheduled medicines': 'दवाइयों के निर्धारित समय का ध्यान रखें',
'Daily routines': 'दैनिक दिनचर्या',
'Meals, walks and appointments': 'भोजन, सैर और अपॉइंटमेंट',
'Voice assistance': 'आवाज़ से सहायता',
'Simple, accessible interaction': 'आसानी से बातचीत करें',
'Emergency help': 'आपातकालीन सहायता',
'Quick access to emergency contacts': 'आपातकालीन संपर्कों तक तुरंत पहुँचें',
'Health profile': 'स्वास्थ्य प्रोफ़ाइल',
'Important care details in one place': 'देखभाल की ज़रूरी जानकारी एक जगह',
'Family connection': 'परिवार से जुड़ाव',
'Help loved ones stay informed': 'अपने प्रियजनों को जानकारी देते रहें',

'Create your personal profile': 'अपनी व्यक्तिगत प्रोफ़ाइल बनाएँ',
'Add routines, medicines and emergency contacts': 'दिनचर्या, दवाइयाँ और आपातकालीन संपर्क जोड़ें',
'Confirm completed activities in your dashboard': 'डैशबोर्ड में पूरे किए गए कामों की पुष्टि करें',
'Review daily progress at a glance': 'दिनभर की प्रगति एक नज़र में देखें',
  }
};
const googleTr = {
  mr: { 'Sign up with Google':'Google सह नोंदणी करा', 'Log in with Google':'Google सह लॉग इन करा', 'Continue with Google':'Google सह सुरू ठेवा', 'or':'किंवा', 'Google sign-in failed. Please try again.':'Google साइन-इन अयशस्वी. कृपया पुन्हा प्रयत्न करा.' },
  hi: { 'Sign up with Google':'Google से साइन अप करें', 'Log in with Google':'Google से लॉग इन करें', 'Continue with Google':'Google से जारी रखें', 'or':'या', 'Google sign-in failed. Please try again.':'Google साइन-इन विफल रहा। कृपया पुनः प्रयास करें।' },
};
const scanTr = {
  mr: {"Scan prescription": "प्रिस्क्रिप्शन स्कॅन करा", "Take a photo of your prescription. It is read on your phone and the photo is never uploaded.": "तुमच्या प्रिस्क्रिप्शनचा फोटो घ्या. तो फक्त तुमच्या फोनवर वाचला जातो आणि फोटो कधीही अपलोड होत नाही.", "Take photo": "फोटो काढा", "Choose from gallery": "गॅलरीतून निवडा", "Reading prescription...": "प्रिस्क्रिप्शन वाचत आहे...", "Medicine lines found": "सापडलेल्या औषधांच्या ओळी", "Names, phone numbers and addresses are removed. Only these lines can be sent to the AI:": "नावे, फोन नंबर आणि पत्ते काढून टाकले आहेत. फक्त या ओळी AI कडे पाठवल्या जाऊ शकतात:", "Improve with AI": "AI ने अधिक अचूक करा", "Use phone reading only": "फक्त फोनवरील वाचन वापरा", "The photo always stays on your phone.": "फोटो नेहमी तुमच्या फोनवरच राहतो.", "AI could not read it, showing phone reading instead.": "AI ला वाचता आले नाही, म्हणून फोनवरील वाचन दाखवत आहे.", "Check every medicine against your prescription. Saathi can make mistakes.": "प्रत्येक औषध तुमच्या प्रिस्क्रिप्शनशी तपासा. साथी चुकू शकतो.", "Include": "समाविष्ट करा", "Add selected medicines": "निवडलेली औषधे जोडा", "Scan again": "पुन्हा स्कॅन करा", "No medicines found. Try a clearer, well-lit photo.": "औषधे सापडली नाहीत. अधिक स्पष्ट, उजेडातला फोटो घ्या.", "Camera permission is needed to take a photo.": "फोटो काढण्यासाठी कॅमेरा परवानगी आवश्यक आहे.", "Could not read the photo. Please try again.": "फोटो वाचता आला नाही. कृपया पुन्हा प्रयत्न करा.", "Select at least one medicine.": "किमान एक औषध निवडा.", "Name, dosage and time are required for each selected medicine.": "निवडलेल्या प्रत्येक औषधासाठी नाव, डोस आणि वेळ आवश्यक आहे.", "Daily summary": "दैनिक सारांश", "Refresh summary": "सारांश अद्यतनित करा", "Talk to Saathi": "साथीशी बोला"},
  hi: {"Scan prescription": "प्रिस्क्रिप्शन स्कैन करें", "Take a photo of your prescription. It is read on your phone and the photo is never uploaded.": "अपने प्रिस्क्रिप्शन की फोटो लें। इसे सिर्फ आपके फोन पर पढ़ा जाता है और फोटो कभी अपलोड नहीं होती।", "Take photo": "फोटो लें", "Choose from gallery": "गैलरी से चुनें", "Reading prescription...": "प्रिस्क्रिप्शन पढ़ रहे हैं...", "Medicine lines found": "मिली दवाओं की पंक्तियाँ", "Names, phone numbers and addresses are removed. Only these lines can be sent to the AI:": "नाम, फ़ोन नंबर और पते हटा दिए गए हैं। सिर्फ़ यही पंक्तियाँ AI को भेजी जा सकती हैं:", "Improve with AI": "AI से बेहतर करें", "Use phone reading only": "सिर्फ़ फ़ोन की रीडिंग इस्तेमाल करें", "The photo always stays on your phone.": "फोटो हमेशा आपके फोन पर ही रहती है।", "AI could not read it, showing phone reading instead.": "AI पढ़ नहीं सका, इसलिए फ़ोन की रीडिंग दिखा रहे हैं।", "Check every medicine against your prescription. Saathi can make mistakes.": "हर दवा को अपने प्रिस्क्रिप्शन से मिलाकर जाँचें। साथी गलती कर सकता है।", "Include": "शामिल करें", "Add selected medicines": "चुनी हुई दवाएँ जोड़ें", "Scan again": "फिर से स्कैन करें", "No medicines found. Try a clearer, well-lit photo.": "कोई दवा नहीं मिली। ज़्यादा साफ़, रोशनी वाली फोटो लें।", "Camera permission is needed to take a photo.": "फोटो लेने के लिए कैमरा अनुमति ज़रूरी है।", "Could not read the photo. Please try again.": "फोटो पढ़ी नहीं जा सकी। कृपया फिर से कोशिश करें।", "Select at least one medicine.": "कम से कम एक दवा चुनें।", "Name, dosage and time are required for each selected medicine.": "चुनी हुई हर दवा के लिए नाम, खुराक और समय ज़रूरी है।", "Daily summary": "दैनिक सारांश", "Refresh summary": "सारांश ताज़ा करें", "Talk to Saathi": "साथी से बात करें"},
};
export const translate = (key, language) => translations[language]?.[key] || googleTr[language]?.[key] || scanTr[language]?.[key] || key;
export function SaathiProvider({ children }) {
  const [currentUser, setCurrentUserState] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [language, setLanguageState] = useState('en');
  const [languageChosen, setLanguageChosen] = useState(false);
  const t = useCallback((key) => translate(key, language), [language]);
  const setLanguage = useCallback(async (next) => {
    const value = ['en','mr','hi'].includes(next) ? next : 'en';
    setLanguageState(value);
    setLanguageChosen(true);
    try { if (Platform.OS === 'web') localStorage.setItem('saathi_language', value); else await SecureStore.setItemAsync('saathi_language', value); } catch {}
  }, []);
  const [profile, setProfileState] = useState(emptyProfile);
  const [routines, setRoutinesState] = useState([]);
  const [medicines, setMedicinesState] = useState([]);
  const [contacts, setContactsState] = useState(emptyContacts);
  const [welcomeShown, setWelcomeShown] = useState(false);
  const [done, setDone] = useState({});
  const [taken, setTaken] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);
  
  const loadUserData = useCallback(async () => {
    try {
      const [p, r, m, c] = await Promise.all([API.getProfile(), API.getRoutines(), API.getMedicines(), API.getContacts()]);
      if (p && p.name) setProfileState({ ...emptyProfile, ...p, age: String(p.age || '') }); else setProfileState(emptyProfile);
      setRoutinesState(Array.isArray(r) ? r : []);
      setMedicinesState(Array.isArray(m) ? m : []);
      setContactsState(c && c.name ? { ...emptyContacts, ...c } : emptyContacts);
      const now = new Date();
      const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
      const completions = await API.getCompletions(date);
      const routineDone = {}, medicineTaken = {};
      completions.forEach((item) => {
        const itemId = String(item.itemId), itemTime = item.time || '';
        if (item.itemType === 'routine') routineDone[itemId] = item.reportedDone;
        if (item.itemType === 'medicine') {
          const medicine = m.find((med) => String(med._id) === itemId);
          if (medicine) medicineTaken[`${medicine._id}|${medicine.name}|${itemTime}`] = item.reportedDone ? (itemTime || 'done') : '';
        }
      });
      setDone(routineDone); setTaken(medicineTaken);
    } catch (error) { Alert.alert('Saathi', error.message || 'Could not load your saved data.'); }
    finally { setDataLoaded(true); }
  }, []);
  const setCurrentUser = useCallback((user) => setCurrentUserState(user), []);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const savedLanguage = Platform.OS === 'web' ? localStorage.getItem('saathi_language') : await SecureStore.getItemAsync('saathi_language');
        if (active && savedLanguage && ['en','mr','hi'].includes(savedLanguage)) { setLanguageState(savedLanguage); setLanguageChosen(true); }
        const token = await API.getAuthToken();
        if (!token) return;
        const user = await API.getCareStatus();
        if (active) setCurrentUserState({ name: user.profile?.name || 'Saathi user', email: '' });
      } catch { await API.logout(); } finally { if (active) setAuthLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (currentUser) loadUserData();
    else { setProfileState(emptyProfile); setRoutinesState([]); setMedicinesState([]); setContactsState(emptyContacts); setDone({}); setTaken({}); setDataLoaded(false); setWelcomeShown(false); }
  }, [currentUser, loadUserData]);
  // Re-schedule "5 minutes before" routine reminders whenever routines change,
  // the profile language changes, or the user logs in / out.
  useEffect(() => {
    if (!currentUser) { clearRoutineReminders(); return undefined; }
    syncRoutineReminders(routines, profile.language, language);

    // Refresh the rolling reminder window whenever the app comes to the foreground.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncRoutineReminders(routines, profile.language, language);
    });
    return () => sub.remove();
  }, [currentUser, routines, profile.language, language]);
  useEffect(() => {
  if (!currentUser) {
    return;
  }

  syncMedicineReminders(medicines, profile.language, language);

  // Refresh the rolling reminder window whenever the app comes to the foreground.
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') syncMedicineReminders(medicines, profile.language, language);
  });
  return () => sub.remove();
}, [currentUser, medicines, profile.language, language]);
  const setProfile = useCallback((next) => setProfileState(prev => typeof next === 'function' ? next(prev) : next), []);
  const setRoutines = useCallback((next) => setRoutinesState(prev => { const value = typeof next === 'function' ? next(prev) : next; API.saveRoutines(value).catch(error => Alert.alert('Save failed', error.message)); return value; }), []);
  const setMedicines = useCallback((next) => setMedicinesState((prev) => { const value = typeof next === 'function' ? next(prev) : next; API.saveMedicines(value, prev).then(saved => { if (Array.isArray(saved)) setMedicinesState(saved); }).catch(error => Alert.alert('Save failed', error.message)); return value; }), []);
  const setContacts = useCallback((next) => setContactsState(prev => typeof next === 'function' ? next(prev) : next), []);
  return <Ctx.Provider value={{ currentUser, setCurrentUser, authLoading, profile, setProfile, routines, setRoutines, medicines, setMedicines, contacts, setContacts, welcomeShown, setWelcomeShown, done, setDone, taken, setTaken, loadUserData, dataLoaded, language, setLanguage, languageChosen, t }}>
    {children}
  </Ctx.Provider>;
}
const emptyProfile = { name:'', age:'', language:'Hindi', phone:'', address:'', conditions:'', allergies:'', doctor:'', doctorPhone:'' };
const emptyContacts = { name:'', relation:'', phone:'', name2:'', phone2:'', doctor:'', doctorPhone:'' };
