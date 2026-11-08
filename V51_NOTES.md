# FLASH STORE V51 — About formatting & Orders board

- Store Settings > About text now safely renders Markdown-like headings (# / ## / ###), bold (**text**), emoji, and paragraph line breaks on the homepage footer. HTML is escaped by using DOM text nodes.
- Orders admin tab now shows Processing, Completed and Canceled columns. Moving an order updates the existing status API and it appears in the appropriate column on refresh.
- Existing orders, products, reviews, API and database remain unchanged. No SQL migration required.
- Other pages and product descriptions are not changed.
- Upload the contents of this ZIP to the GitHub repo (not the ZIP itself), deploy and test with a non-sensitive test order.
