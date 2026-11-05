import { Redirect } from 'expo-router';

// Keep historical deep links valid without shipping a trading guide or exchange routes.
// Hiding a tab does not remove its deep-link destination.
export default function RetiredBuyScreen() {
  return <Redirect href="/" />;
}
