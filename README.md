# Water temperature scraper for lakes in Berlin Brandenburg and Altmark

This Github action scrapes the water temperatures from this website: https://wind.met.fu-berlin.de/mvdtext/mvd_text.htm

You can find the list of historic temperatures in the file data.csv.

Run the script with this command
```bash
node index.js
```

To build the script for Github actions run this command
```bash
ncc build index.js -o bin
```
This will generate a js file without any dependencies, which works with Github actions.
See https://www.npmjs.com/package/@vercel/ncc for more information.
