// ============================================================
//  SETTINGS — this is the only file you need to edit.
// ============================================================

// 1) Paste your Firebase web app config here (see README.md).
//    Until you do, the site runs in demo mode: it works, but only
//    between tabs on the same computer, so you can try it out.
export const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "",
  databaseURL: "",          // looks like https://your-project-default-rtdb.firebaseio.com
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// 2) PIN for the teacher page. Change this before sharing the link.
export const TEACHER_PIN = "1234";

// 3) What students see.
export const ROOM_NAME = "CS Lab Help Desk";
export const TEACHER_NAME = "Your teacher";   // e.g. "Mr. Garcia" -> "Mr. Garcia is on the way"
