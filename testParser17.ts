const date = "Invalid Date";
const d = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, ' ').toUpperCase();
console.log(d);
