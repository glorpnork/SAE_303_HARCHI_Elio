export default async function downloadData(path) {
  const data = await d3.csv(path);
  return data;
}
