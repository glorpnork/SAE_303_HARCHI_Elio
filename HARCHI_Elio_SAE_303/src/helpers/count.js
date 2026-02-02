import unpack from "./unpack.js";

export default function count(rows, key) {
  const dataArray = unpack(rows, key);
  // technique qui permet de récupérer les modalités de la variable.
  const values = Array.from(new Set(dataArray));
  // initialisation des compteurs
  const counts = {};  
  for (const value of values) {
    counts[value] = 0;
  }
  //comptage
  for (const value of dataArray) {    
    counts[value] += 1;    
  }
  return counts;
}
