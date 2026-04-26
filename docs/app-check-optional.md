# App Check (optional hardening, post Rules baseline)

[Firebase App Check](https://firebase.google.com/docs/app-check) can reduce abuse of your Firebase **web** API key and can be combined with your backend later.

- **When:** After [Firestore/Storage rules](../firestore.rules) are **not** world-open and you have a stable production host.
- **Client:** Register the web app, enable a provider (reCAPTCHA v3, etc.) in the Firebase console.
- **Server:** If you add verification on Cloud Run, validate App Check tokens on the same requests as Firebase ID tokens (separate concern).

**Note:** The Firebase web `apiKey` is already public; App Check and strict **rules** are the main levers, not “hiding” the key.

See plan ticket **TORP-SEC-04**.
