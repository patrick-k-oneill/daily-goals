import { Redirect } from 'expo-router';

/**
 * The Week tab was retired — it rendered a strict subset of Today. The route
 * stays as a redirect so bookmarks and muscle-memory URLs land on the page.
 */
export default function WeekRedirect() {
  return <Redirect href="/" />;
}
