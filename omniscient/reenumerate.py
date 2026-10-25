# One-off: renumber Leo.checks so ids run 0, 1, 2, ... in date order.
# Dry run by default; pass --apply to write.
#   python reenumerate.py           # show what would change
#   python reenumerate.py --apply   # write the new ids
import sys
import pymongo

DB_USER = "admin"
DB_PASS = "ucHwzMCGZOeawfY5Xf9s"
uri = f"mongodb://{DB_USER}:{DB_PASS}@192.168.10.30:27017"

apply = "--apply" in sys.argv
checks = pymongo.MongoClient(uri)["Leo"]["checks"]

# only real checks have a date; put_test() writes {"test": 1} without one
# _id breaks ties between checks with the same date by insertion order
cursor = checks.find(
    {"date": {"$exists": True}}, {"id": 1, "date": 1, "description": 1}
).sort([("date", 1), ("_id", 1)])

updates = []
for new_id, doc in enumerate(cursor):
    old_id = doc.get("id")
    if old_id != new_id:
        print(
            f"{doc['date']}  {doc.get('description', '')!s:<24}  {old_id} -> {new_id}"
        )
        updates.append(pymongo.UpdateOne({"_id": doc["_id"]}, {"$set": {"id": new_id}}))

total = checks.count_documents({"date": {"$exists": True}})
print(f"\n{total} checks, {len(updates)} need a new id. Next free id: {total}")

if not updates:
    sys.exit(0)
if not apply:
    print("Dry run, nothing written. Re-run with --apply.")
    sys.exit(0)

result = checks.bulk_write(updates, ordered=True)
print(f"Updated {result.modified_count} documents.")
