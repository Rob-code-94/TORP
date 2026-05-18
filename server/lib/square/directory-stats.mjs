export async function countSquareDirectoryCustomers(sq, maxPages = 100) {
  let total = 0;
  let page = await sq.customers.list({ limit: 100 });
  for (let p = 0; p < maxPages; p++) {
    total += page.data.length;
    if (!page.hasNextPage()) break;
    page = await page.getNextPage();
  }
  return total;
}
