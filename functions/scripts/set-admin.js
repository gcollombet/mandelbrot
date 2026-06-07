const admin = require('firebase-admin');

admin.initializeApp();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npm run set-admin -- <google-account-email>');
    process.exit(1);
  }

  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, {admin: true, role: 'admin'});
  await admin.firestore().doc(`admins/${user.uid}`).set({email, role: 'admin', updatedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true});
  console.log(`Admin role set for ${email} (${user.uid}). Sign out/in to refresh the token.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
