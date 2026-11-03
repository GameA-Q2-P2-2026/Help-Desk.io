# Classroom Help Desk

Students type their name and tap **Request help**. Your teacher page chimes and
shows them in line.

## Setup
1. Change `TEACHER_PIN` in `config.js` (optional: `ROOM_NAME`, `TEACHER_NAME`).
2. Upload all the files to a GitHub repository (top level, not in a folder).
3. **Settings > Pages**: Source **Deploy from a branch**, branch `main`, folder `/ (root)`.

That's it. No accounts or databases.

- Student page: `https://YOUR-USERNAME.github.io/REPO-NAME/`
- Teacher page: `https://YOUR-USERNAME.github.io/REPO-NAME/teacher.html`

## Using it
- Open the teacher page and click **Turn on sound and pop-ups** once each time you
  load it (browsers block sound until you click).
- Click **Done** when you've helped someone. If a student taps **I'm all set**,
  they leave the line on their own.
- **Start new class** clears the list and restarts numbers at 1.
- Wait times turn red after 5 minutes.
- If you refresh the teacher page, the list comes back (up to 12 hours).

## How it works
GitHub Pages can only host files, so requests are passed along by **ntfy.sh**, a free
public message service that needs no account. The site makes its own channel name
from its web address, so your copy doesn't collide with anyone else's. The teacher
page shows the channel name at the bottom.

## Good to know
- **Test it on a student computer first.** If the school web filter blocks `ntfy.sh`,
  students will see "Your request didn't send" and the teacher page will say
  "Reconnecting…". Ask IT to allow `ntfy.sh`.
- **Free limit:** ntfy.sh allows about 250 messages a day per internet address, and a
  whole school usually shares one address. Each request uses one message (two if the
  student taps "I'm all set"), which is plenty for a classroom unless other people at
  school also use ntfy.sh heavily.
- **Privacy:** only first names should go in. The channel is hard to guess but not
  secret; anyone who reads the page code could see requests.
- The PIN keeps curious students out of the teacher view, but it's in `config.js`,
  which anyone can read.
