# ECAS backend setup (about 10 minutes)

## 1. Create the script
1. Go to **script.google.com** while signed in to the Google account that should own the data.
2. Click **New project** and name it `ECAS Backend`.
3. Delete the starter code, paste all of `Code.gs`, then click **Save**.

## 2. Run setup once
1. In the function menu at the top, choose **setup**, then click **Run**.
2. Approve the permissions (Drive and Sheets). Google warns that the app is unverified. This is your own script, so click **Advanced → Go to ECAS Backend**.
3. Open **Execution log**. It shows:
   - the link to the new **ECAS From Seed to Plate** folder in your Drive
   - the link to the **ECAS Data** sheet
   - your **teacher PIN** (default `246810`)
4. **Change the teacher PIN:** ⚙️ Project Settings → Script properties → `TEACHER_PIN`.

## 3. Deploy as a web app
1. Click **Deploy → New deployment → Web app**.
2. Set **Execute as: Me** and **Who has access: Anyone**.
3. Click **Deploy**, then copy the **Web app URL** (it ends in `/exec`).
4. Send me that URL. I'll connect the app to it.

> "Anyone" means the app can reach the script without a Google sign-in. Nobody can browse your Drive: the script only returns a student's own data after their class, register number and PIN match.

## How student data is kept separate
- Each student has a private folder: `Students/P3-2 #14/` containing `state.json` and a `Photos` folder.
- The folders stay **private to you**. Students reach *their own* folder only through the app, using their PIN.
- PINs are stored scrambled (hashed), never as plain numbers.
- Photos stay **pending** until you approve them on the teacher page.

### Optional: let students open their folder in Google Drive
Only do this if your school allows sharing from your Drive to MOE iCON accounts:
1. Set `SHARE_WITH_STUDENT_EMAIL = true` in `Code.gs`.
2. The app will then ask for the student's iCON email on first sign-in, and share their folder with that email as **view only**.

I recommend leaving this **off**. P3 students can't easily manage Drive, and sharing personal-Drive folders with students may conflict with school data policy.

## Updating the script later
Use **Deploy → Manage deployments → ✏️ Edit → Version: New version**. This keeps the same URL.
