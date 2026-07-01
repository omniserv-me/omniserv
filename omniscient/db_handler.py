import os
import pymongo
from check import Check
from datetime import datetime

db_user = os.getenv("MONGO_USR")
db_pass = os.getenv("MONGO_PWD")
uri = f"mongodb://{db_user}:{db_pass}@mongodb:27017"
dbclient = pymongo.MongoClient(uri)
db = dbclient["Leo"]
checks = db["checks"]

def put_test() -> None:
    checks.insert_one({"test": 1})

def put_check(check: Check) -> None:
    checks.insert_one(check.__dict__)

def delete_check(id: str):
    checks.delete_one({"id": id})

def is_check_in_db(check: Check) -> bool:
    return bool(checks.find_one({"id": check.id}))

def month_start() -> datetime:
    today = datetime.today()
    month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return month_start

def day_start() -> datetime:
    today = datetime.today()
    day_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    return day_start


def get_month_checks():
    start_date = month_start()
    print(f"Getting checks from {start_date}")
    query = {"date": {"$gte": start_date}}
    return checks.find(query)

def get_day_checks():
    start_date = day_start()
    print(f"Getting checks from {start_date}")
    query = {"date": {"$gte": start_date}}
    return checks.find(query)


def monthly_report() -> None:
    cursor = get_month_checks()
    out: int = 0
    counter: int = 0
    for check in cursor:
        out += int(check["amount"]*100)
        counter += 1

    check_avg: float = round(out / counter / 100, 2)
    day_avg: float = round(out / datetime.today().day / 100, 2)
    out: float = out / 100
    msg = f'''You have spent {out} Euro this month on groceries and stuff.
Your checks averaged {check_avg} Euro this month.
Your expenses averaged {day_avg} Euro per day this month.'''
    print(msg)

def daily_report() -> None:
    cursor = get_day_checks()
    out: int = 0
    counter: int = 0
    for check in cursor:
        out += int(check["amount"] * 100)
        counter += 1

    if counter > 0:
        check_avg: float = round(out / counter / 100, 2)
        out: float = out / 100
        msg = f'''You have spent {out} Euro in the past 24h on groceries and stuff.
Your checks averaged {check_avg} Euro this day.'''
        print(msg)

# queries the database for all payments between two timestamps, returns total amount
def query_date(start: datetime, end: datetime) -> int:
    sum: int = 0
    query = {
        "$and": [
            {"date": {"$gte": start}},
            {"date": {"$lte": end}}
        ]
    }
    cursor = checks.find(query)
    for check in cursor:
        sum += int(check["amount"] * 100)

    return sum