import json
import os

with open("data/full_board_data.json", encoding="utf-8") as f:
    raw = json.load(f)

posts = raw.get("posts", [])
stats = raw.get("stats", {})

processed = []
for p in posts:
    pid = p["id"]
    p_stats = stats.get(pid, {})
    
    # Calculate likes from reactions
    likes = 0
    for r in p_stats.get("reactions", []):
        likes += r.get("count", 1)
    
    # Attachments
    images = []
    for att in p.get("attachments", []):
        fid = att["id"]
        fname = f"{fid}.jpg"
        if os.path.exists(os.path.join("images", fname)):
            images.append(f"images/{fname}")
    
    comments = []
    for c in p_stats.get("latest", []):
        comments.append({
            "name": c.get("name") or "訪客",
            "body": c.get("body") or "",
            "createdAt": c.get("createdAt")
        })
    
    processed.append({
        "id": pid,
        "name": (p.get("name") or "").strip() or "匿名學生",
        "title": (p.get("title") or "").strip(),
        "body": (p.get("body") or "").strip(),
        "link": (p.get("link") or "").strip(),
        "order": p.get("order", 0),
        "createdAt": p.get("createdAt"),
        "images": images,
        "likes": likes,
        "commentsCount": p_stats.get("comments", len(comments)),
        "comments": comments
    })

with open("data/posts.json", "w", encoding="utf-8") as f:
    json.dump(processed, f, ensure_ascii=False, indent=2)

# Also write as javascript file window.__POSTS_DATA__ for static web deployment without CORS issues
with open("posts_data.js", "w", encoding="utf-8") as f:
    f.write("window.__BOARD_DATA__ = ")
    json.dump({
        "title": "20261102 | 茶米投中美術班",
        "subtitle": "189 則貼文 · 原創學生作品展示板",
        "originalUrl": "https://sharebar.app/zh/boards/1a003596-dba1-4e12-a4a3-b22011422f0c",
        "posts": processed
    }, f, ensure_ascii=False, indent=2)
    f.write(";\n")

print(f"Successfully processed {len(processed)} posts and generated posts_data.js!")
