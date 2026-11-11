import asyncio
from playwright.async_api import async_playwright
import json
import os
import aiohttp
import urllib.request

BOARD_ID = "1a003596-dba1-4e12-a4a3-b22011422f0c"

async def main():
    os.makedirs("data", exist_ok=True)
    os.makedirs("images", exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            headless=True
        )
        context = await browser.new_context()
        page = await context.new_page()

        print("Navigating to board...")
        await page.goto(f"https://sharebar.app/zh/boards/{BOARD_ID}", wait_until="networkidle")

        # Join board with nickname nato
        input_el = page.locator("input")
        if await input_el.count() > 0:
            await input_el.first.fill("nato")
            submit_btn = page.locator("button:has-text('進入看板'), button[type='submit']")
            if await submit_btn.count() > 0:
                await submit_btn.first.click()
            else:
                await input_el.first.press("Enter")
        await page.wait_for_timeout(3000)

        # Get initial board payload
        print("Fetching initial board data...")
        board_init = await page.evaluate(f"""async () => {{
            const res = await fetch('/api/boards/{BOARD_ID}?paged=1&cols=5');
            return await res.json();
        }}""")

        with open("data/board_init.json", "w", encoding="utf-8") as f:
            json.dump(board_init, f, ensure_ascii=False, indent=2)

        all_posts = list(board_init.get("posts", []))
        all_stats = dict(board_init.get("stats", {}))
        print(f"Initial posts: {len(all_posts)}")

        # Now paginate all posts
        # Check cursor from initial posts if any, or start flow
        cursor = None
        # Try fetching posts with limit 50
        page_num = 1
        while True:
            url = f"/api/boards/{BOARD_ID}/posts?o=flow&limit=50"
            if cursor:
                url += f"&cursor={urllib.request.quote(cursor)}"
            
            print(f"Fetching posts page {page_num}...")
            res_data = await page.evaluate(f"""async (fetchUrl) => {{
                const res = await fetch(fetchUrl);
                return await res.json();
            }}""", url)

            new_posts = res_data.get("posts", [])
            new_stats = res_data.get("stats", {})
            cursor = res_data.get("cursor")

            if not new_posts:
                print("No more posts returned.")
                break

            existing_ids = {p["id"] for p in all_posts}
            added = 0
            for p in new_posts:
                if p["id"] not in existing_ids:
                    all_posts.append(p)
                    added += 1
            all_stats.update(new_stats)
            print(f"Added {added} posts (Total: {len(all_posts)}), next cursor: {bool(cursor)}")

            if not cursor or added == 0:
                break
            page_num += 1
            await asyncio.sleep(0.3)

        print(f"Total posts collected: {len(all_posts)}")

        full_data = {
            "board": board_init.get("data", {}),
            "entities": board_init.get("entities", []),
            "totals": board_init.get("totals", {}),
            "posts": all_posts,
            "stats": all_stats
        }

        with open("data/full_board_data.json", "w", encoding="utf-8") as f:
            json.dump(full_data, f, ensure_ascii=False, indent=2)

        # Now collect all file attachments
        attachments = []
        for p in all_posts:
            for att in p.get("attachments", []):
                attachments.append({
                    "post_id": p["id"],
                    "author": p.get("name", ""),
                    "file_id": att["id"],
                    "file_name": att.get("name", f"{att['id']}.jpg"),
                    "type": att.get("type", "image/jpeg"),
                    "size": att.get("size", 0)
                })

        print(f"Total attachments to download: {len(attachments)}")

        # Fetch signed download URLs for each attachment
        file_urls = {}
        for idx, att in enumerate(attachments):
            fid = att["file_id"]
            if fid in file_urls:
                continue
            try:
                res_file = await page.evaluate(f"""async (fid) => {{
                    const res = await fetch('/api/boards/{BOARD_ID}/files/' + fid);
                    return await res.json();
                }}""", fid)
                file_urls[fid] = res_file.get("url")
            except Exception as e:
                print(f"Error getting file url for {fid}: {e}")
            if (idx + 1) % 20 == 0:
                print(f"Got URLs for {idx + 1}/{len(attachments)} files")

        with open("data/file_urls.json", "w", encoding="utf-8") as f:
            json.dump(file_urls, f, ensure_ascii=False, indent=2)

        await browser.close()

    print("Browser closed. Now downloading images asynchronously...")
    # Download images using aiohttp
    async with aiohttp.ClientSession() as session:
        for idx, (fid, url) in enumerate(file_urls.items()):
            if not url:
                continue
            ext = ".jpg"
            if ".png" in url.lower():
                ext = ".png"
            elif ".webp" in url.lower():
                ext = ".webp"
            elif ".gif" in url.lower():
                ext = ".gif"
            
            dest_path = os.path.join("images", f"{fid}{ext}")
            if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
                continue

            try:
                async with session.get(url, timeout=30) as resp:
                    if resp.status == 200:
                        content = await resp.read()
                        with open(dest_path, "wb") as f_out:
                            f_out.write(content)
                    else:
                        print(f"Failed to download {fid}: HTTP {resp.status}")
            except Exception as e:
                print(f"Error downloading {fid}: {e}")

            if (idx + 1) % 20 == 0 or idx + 1 == len(file_urls):
                print(f"Downloaded {idx + 1}/{len(file_urls)} images")

    print("All tasks finished successfully!")

asyncio.run(main())
