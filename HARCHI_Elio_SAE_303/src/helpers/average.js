import unpack from "./unpack.js";

// cette fonction permet de faire une agrégation de données avec pour fonction d'agrégation: la moyenne
// rows doit contenir le tableau de données issu du CSV
// groupBy doit contenir le titre de la colonne selon laquelle on fait le regroupement. Idéalement, une variable avec peu de modalités, catégorielle ou ordinale.
// key doit contenir le titre de la colonne pour laquelle on fait la moyenne: une variable quantitative

export default function average(rows, groupBy, key) {
  // obtention de la colonne dont le titre est groupBy
  const dataArray = unpack(rows, groupBy);
  // technique qui permet de récupérer les modalités de la variable dont le titre est groupBy
  const values = Array.from(new Set(dataArray));

  // initialisation des compteurs
  const averages = {};
  for (const value of values) {
    averages[value] = 0;
  }

  //comptage
  for (const value of values) {
    // filtrage selon la valeur considére
    const filteredRows = rows.filter((row) => row[groupBy] === value);
    // obtention du tableau des valeurs dont on doit calculer la moyenne avec conversion dans le type nombre si nécessaire
    const numbers = unpack(filteredRows, key).map((number) => Number(number));
    // calcul de la moyenne d'un tableau à l'aide de la fonction mean de la librairie d3
    averages[value] = d3.mean(numbers);
  }
  return averages;
}
