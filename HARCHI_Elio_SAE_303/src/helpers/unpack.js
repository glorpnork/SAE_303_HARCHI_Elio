export default function unpack(rows, key) {
  return rows.map((row) => row[key]);
}
