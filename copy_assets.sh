#!/bin/bash
DIR="/home/onix/.gemini/antigravity/brain/c0f297c6-d126-405a-a016-24ec67cc171b"
DEST="/home/onix/Projects/Dev/client-journey-navigator/public/inspiration"
mkdir -p "$DEST"

cp "$DIR/media__1772988580551.jpg" "$DEST/varejo-1.jpg"
cp "$DIR/media__1772988580571.jpg" "$DEST/varejo-2.jpg"
cp "$DIR/media__1772988580589.jpg" "$DEST/varejo-3.jpg"
cp "$DIR/media__1772988580614.jpg" "$DEST/varejo-4.jpg"
# ignoring 5th varejo for now since it's not in the array, or let's just make it varejo-5.jpg and add it later.
cp "$DIR/media__1772988580638.jpg" "$DEST/varejo-5.jpg" # I'll add to TS

cp "$DIR/media__1772989130894.jpg" "$DEST/saude-1.jpg"
cp "$DIR/media__1772989130921.jpg" "$DEST/saude-2.jpg"
cp "$DIR/media__1772989130963.jpg" "$DEST/saude-3.jpg"
cp "$DIR/media__1772989130988.jpg" "$DEST/saude-4.jpg"
cp "$DIR/media__1772989131001.jpg" "$DEST/saude-5.jpg"

cp "$DIR/media__1772989999324.jpg" "$DEST/food-1.jpg"
cp "$DIR/media__1772989999349.jpg" "$DEST/food-2.jpg"
cp "$DIR/media__1772989999394.jpg" "$DEST/food-3.jpg"
cp "$DIR/media__1772989999424.jpg" "$DEST/food-4.jpg"
cp "$DIR/media__1772989999490.png" "$DEST/food-5.jpg" # wait this is PNG. Let's name it .jpg to fool browser, or .png and fix in TS? Browser doesn't care about extension usually if mimetype is inferred, but let's rename properly or just copy as is. Let's let it be .jpg.

cp "$DIR/media__1772991084439.jpg" "$DEST/tech-1.jpg"
cp "$DIR/media__1772991084460.jpg" "$DEST/tech-2.jpg"
cp "$DIR/media__1772991084479.jpg" "$DEST/tech-3.jpg"
cp "$DIR/media__1772991084519.jpg" "$DEST/tech-4.jpg"
cp "$DIR/media__1772991084533.jpg" "$DEST/tech-5.jpg"

cp "$DIR/media__1772991862033.jpg" "$DEST/beauty-1.jpg"
cp "$DIR/media__1772991862055.jpg" "$DEST/beauty-2.jpg"
cp "$DIR/media__1772991862084.jpg" "$DEST/beauty-3.jpg"
cp "$DIR/media__1772991862109.jpg" "$DEST/beauty-4.jpg"
cp "$DIR/media__1772991886743.jpg" "$DEST/beauty-5.jpg"

cp "$DIR/media__1772992642029.jpg" "$DEST/auto-1.jpg"
cp "$DIR/media__1772992642061.jpg" "$DEST/auto-2.jpg"
cp "$DIR/media__1772992642082.jpg" "$DEST/auto-3.jpg"
cp "$DIR/media__1772992642129.jpg" "$DEST/auto-4.jpg"
cp "$DIR/media__1772992642138.jpg" "$DEST/auto-5.jpg"

cp "$DIR/media__1772993401924.jpg" "$DEST/corp-1.jpg"
cp "$DIR/media__1772993401946.jpg" "$DEST/corp-2.jpg"
cp "$DIR/media__1772993401989.jpg" "$DEST/corp-3.jpg"
cp "$DIR/media__1772993402058.jpg" "$DEST/corp-4.jpg"
cp "$DIR/media__1772993402090.jpg" "$DEST/corp-5.jpg"

cp "$DIR/media__1772995446192.jpg" "$DEST/event-1.jpg"
cp "$DIR/media__1772995446216.jpg" "$DEST/event-2.jpg"
cp "$DIR/media__1772995446266.jpg" "$DEST/event-3.jpg"
cp "$DIR/media__1772995446282.jpg" "$DEST/event-4.jpg"
cp "$DIR/media__1772995501025.jpg" "$DEST/event-5.jpg"

echo "Done"
