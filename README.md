# Classroom Help Desk

Students type their name and tap "Request help." The teacher page shows the line,
plays a chime, and (optionally) pops up a desktop notification.

- Student page: `https://YOUR-USERNAME.github.io/REPO-NAME/`
- Teacher page: `https://YOUR-USERNAME.github.io/REPO-NAME/teacher.html` (PIN protected)

## Try it first (no setup)
Open `index.html` and `teacher.html` in two tabs of the same browser. Until
Firebase is set up, the site runs in demo mode and only those tabs talk to each other.
(Open them through GitHub Pages or a local server; double-clicking the files
won't load the scripts.)

## Set up Firebase (about 10 minutes, free)
GitHub Pages can't store data, so requests go through Firebase.

1. Go to https://console.firebase.google.com and click **Create a project**.
   Google Analytics can be turned off.
2. In the left menu, open **Build > Realtime Database** and click **Create Database**.
   Pick the US location and start in **locked mode**.
3. Open the **Rules** tab, delete what's there, paste the contents of
   `database.rules.json`, and click **Publish**.
4. Go to **Project settings** (gear icon) > **Your apps** > the **</>** (Web) button.
   Register an app (no hosting needed). Copy the `firebaseConfig` object it shows.
5. Paste it into `config.js`, replacing the placeholder. Make sure `databaseURL`
   is filled in (it's on the Realtime Database page if it's missing).
6. Change `TEACHER_PIN`, and set `ROOM_NAME` and `TEACHER_NAME`.

## Put it on GitHub Pages
1. Create a repository and upload all the files (keep them in the top level).
2. **Settings > Pages**, set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. After a minute, the site is live at the address shown.

## Using it in class
- Open the teacher page and click **Turn on sound and pop-ups** once each time you
  load it (browsers block sound until you click).
- **On my way** tells the student you're coming. **Done** closes the request.
- **Requests paused** stops new requests (for tests, lectures, end of period).
- **Start new class** clears everything and restarts numbers at 1.
- Wait times turn red after 5 minutes.

## Good to know
- The PIN keeps curious students out of the teacher view, but it lives in
  `config.js`, which anyone can read. A determined student could find it or edit
  requests from the browser console. The database rules limit what can be written,
  but this is a classroom tool, not a secure one.
- If your school's web filter blocks `firebaseio.com` or `gstatic.com`, the pages
  will show "Connecting…". Ask IT to allow those two domains.
- The Firebase free plan easily covers a classroom.
