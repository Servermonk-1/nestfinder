# NestFinder — User Guide

How to use NestFinder, for each of the three kinds of account: **student**, **landlord** and **administrator**.

The app runs at `http://localhost:5173` when started locally. See [README.md](README.md) for how to start it.

---

## Contents

- [Before you start](#before-you-start)
- [For students](#for-students)
- [For landlords](#for-landlords)
- [For administrators](#for-administrators)
- [Common questions](#common-questions)

---

## Before you start

NestFinder has three separate entrances. Each account type has its own login page, and an account of one type cannot sign in at another's page.

| Who you are | Where you sign in |
|---|---|
| Student | `/student/login` |
| Landlord | `/landlord/login` |
| Administrator | `/admin/login` |

**Two levels of checking exist, and they do different things.**

*Email verification* proves you can receive mail at the address you gave. You do this yourself by clicking a link.

*Identity verification* proves you are a real person. You upload a photo of an ID document and an administrator reviews it by hand. This is the one that unlocks the actions where a real person could be harmed — contacting a landlord, listing a property, making a booking.

The app deliberately lets you browse without either. The checks apply when you are about to interact with someone.

---

## For students

### 1. Create your account

Go to `/student/register` and enter your full name, email, password, phone number and institution.

You will be asked to complete a CAPTCHA. This blocks automated signups; if it does not appear, the site is running without CAPTCHA keys configured, which is normal in development.

### 2. Verify your email

Check your inbox for a message from NestFinder and click the link. If it does not arrive, sign in and request a new one — the old link stops working when a new one is issued.

If the app is running without email configured, the message is printed to the server console instead. Look in the terminal running the server.

### 3. Sign in

Go to `/student/login`. Every sign-in sends a six-digit code to your email, which you enter to finish logging in.

You can tick **remember this device** to skip the code next time on that same device. Any other device still asks for one.

After five failed attempts within ten minutes, that email is locked out for thirty minutes. This is deliberate and clears on its own.

### 4. Verify your identity

Open **Account**, find the verification card, and upload a photo of your student ID or a government ID.

An administrator reviews it. Until it is approved you can browse and compare freely, but you cannot message a landlord or make a booking.

### 5. Tell the app where you are working

This is the step that makes NestFinder different from a general property site.

Go to **Companies**. You will find 108 organisations in Ibadan that take SIWES students, each showing the departments it accepts. Find yours, open it, and set it as your placement with your start and end dates.

**If your placement centre is not listed**, use the option to submit it. Give the name and address, and the app will place it on the map so housing can still be ranked by distance to it. An administrator reviews submissions before they appear for everyone else.

Once your placement is confirmed, the app can measure real distance from any room to your workplace, instead of guessing.

### 6. Find somewhere to live

Go to **Browse** (`/dashboard`).

**Filter by:**
- Price range
- City and area
- Room type — single, shared, or self-contained
- Amenities — water, electricity, security, wifi, kitchen, parking

**Sort and narrow by distance.** If you have a confirmed placement, switch on the near-placement option and set a radius. Only rooms within that distance of your workplace are shown.

**Read the map, not just the address.** Every listing is geocoded. If a pin looks wrong, that is worth knowing before you travel to see it.

### 7. Compare properly

Select up to three listings and open **Compare**.

The comparison scores each one across four dimensions — **price**, **amenities**, **trust** and **availability** — and you control how much each matters using the priority sliders. A student who cannot afford to be wrong about electricity should weight amenities up; someone on a tight budget should weight price up. The recommendation changes accordingly.

This is the part to use properly rather than eyeballing two tabs.

### 8. Save what you like

- **Save a listing** — the heart icon. Find them again under **Saved**.
- **Save a search** — keeps your current filters. When a new room appears that matches, you get an email. Manage these under **Saved searches**, where you can rename them, mute alerts, or delete them.

Rooms near the big placement centres go quickly during SIWES intake. Saved searches exist so you do not miss one simply because you were not looking that morning.

### 9. Contact the landlord

Open a listing and use **Message landlord**. This requires identity verification.

Messaging is live — replies appear without refreshing. You can block or report the other person from inside the conversation at any time.

### 10. Book

From the listing, choose **Book**. You will see a full cost breakdown before committing:

- Monthly rent × number of months
- Caution deposit
- Agent fee
- Legal fee
- Service fee

Nothing is hidden and nothing is added later.

The landlord accepts or declines. Once accepted, you pay, and **the money is held in escrow rather than passed straight on**. It is released to the landlord only after you confirm you have actually moved in. If something goes wrong before that, an administrator can refund it.

### 11. Leave a review

After a completed stay you can review the property. Reviews are only possible after a genuine booking that reached move-in — you cannot review a place you never lived in, which is what makes the ratings worth reading.

---

## For landlords

### 1. Create your account and verify

Register at `/landlord/register`, verify your email, then sign in at `/landlord/login`.

Upload an ID document from your **Account** page. **You cannot publish a listing until this is approved.** Students are trusting these listings with money and their safety, so the check is not optional.

### 2. Create a listing

From your dashboard, choose **Add listing**.

**Describe the property**
Title, description, room type, number of rooms, and whether it is furnished.

**Set the price**
Enter the rent and choose whether it is per year or per month. The app converts internally so that a ₦50,000/month room and a ₦600,000/year room compare correctly.

Then add the caution deposit, agent fee and legal fee. Students see all of these before booking.

**Give the address**
The app looks up your address and drops a pin on the map. **Check the pin.** If it is in the wrong place, drag it to the correct spot — this is the single most useful thing you can do for a student deciding whether the room is a sensible commute.

**Add photos**
Up to six. Real photographs of the actual property.

> Uploaded images are checked against listings already on the platform. Photos taken from another listing or reused across several will be flagged for review. Use your own.

**Add the detail students actually ask about**
Electricity hours, water source, generator, internet, waste disposal, noise level, privacy, ventilation, surroundings, viewing hours and minimum stay.

Filling these in properly is what gets your listing through the filters and ranked well in comparisons.

### 3. Manage your listings

Your dashboard lists everything you have posted. From there you can:

- **Edit** any detail, including moving the map pin
- **Mark unavailable** when the room is taken, without deleting it — you can switch it back later
- **Delete** permanently
- See **view counts** and enquiries

### 4. Answer enquiries

**Messages** shows every student conversation. Replies are live.

Answering quickly is worth doing on its own merits — a student comparing three rooms will commit to whichever landlord actually replies.

**Your trust score** is shown to students and feeds the trust dimension in their comparisons. It is built from: identity verification (the single largest factor), how long your account has existed, the average rating across your listings, and penalties for flagged listings, user reports, high fraud scores, or suspension. A brand-new verified landlord starts in reasonable standing and improves with time and good reviews.

### 5. Handle bookings

Requests appear under **Bookings**. For each you can **accept** or **decline** with a reason.

Once a student pays, **the money is held in escrow — not paid to you immediately.** It is released after the student confirms they have moved in. This protects both sides: the student knows they are not paying for a room that does not exist, and you have proof of a committed tenant.

---

## For administrators

Sign in at `/admin/login`. The console has its own navigation.

### Dashboard — `/admin/dashboard`
Overall activity: users, listings, bookings, outstanding tasks.

### Verifications — `/admin/verifications`
The queue that matters most. Students and landlords who have submitted ID documents, waiting on a decision.

Open each submission, view the uploaded document, then **approve** or **reject with a reason**. The person is told the outcome. Rejecting with a clear reason lets them fix the problem and resubmit.

Nobody can message, list, or book until they clear this queue, so leaving it unattended stops the platform working.

### Listings — `/admin/listings`
Every listing, with the flagged ones surfaced first.

Listings are scanned automatically for duplicate photographs and prices that do not make sense for the area. You can **rescan** a single listing or all of them after changing the rules, and **flag** or **delete** anything that should not be public.

A flagged listing is hidden from students until cleared.

### Landlords — `/admin/landlords`
Verify or suspend landlord accounts. Suspension immediately stops the account listing or messaging.

### Reports — `/admin/reports`
Complaints raised by users, about either a listing or another user. For a user report you can read the reported conversation, which is usually enough to judge it. Resolve the report or act on the account.

### SIWES companies — `/admin/companies`
The placement directory.

- Add an organisation, with its address and the departments it accepts
- **Check the map pin** — this drives every distance calculation students see
- Bulk import several at once
- Review student submissions for centres not yet listed, and publish them

### Bookings — `/admin/bookings`
Every booking and its stage. This is where a **refund** is issued when a booking goes wrong before move-in.

### Health — `/admin/health`
Server errors from the running process — how many in the last hour and day, with the failing route and stack trace. Refreshes on its own.

Check this if users report problems. "Nothing has failed" means no errors since the server last started.

---

## Common questions

**I cannot message a landlord.**
Identity verification is not approved yet. Check the verification card on your Account page.

**My verification email never arrived.**
Check spam. Request a new one — this invalidates the old link. If the server is running without email configured, the message is printed to the server terminal instead.

**I am locked out after failing to sign in.**
Deliberate, after repeated failures. Wait and try again, or reset your password.

**The map pin on my listing is wrong.**
Edit the listing and drag it to the right place. Automatic address lookup is not perfect, and a wrong pin is worse than no pin.

**Why can I not review this property?**
Reviews require a completed booking that reached move-in. This keeps ratings honest.

**When does the landlord actually get paid?**
After the student confirms move-in. Until then the money is held in escrow.

**A room is taken. Should I delete the listing?**
No — mark it unavailable. It keeps its reviews and history, and you can bring it back later.
