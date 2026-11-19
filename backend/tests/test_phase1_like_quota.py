# Phase 1: free daily like quota (10/day), rewarded +5 likes (max 3/day), premium unlimited, passes unlimited
import os
import subprocess
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
PW = "Test@12345"


def _login(email):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email_or_phone": email, "password": PW})
    if r.status_code != 200:
        pytest.skip(f"login failed {email}")
    return r.json()["user"]["id"]


def _reset(email):
    subprocess.run(["mongosh", "dating_app_db", "--quiet", "--eval",
                    f'db.users.updateOne({{email:"{email}"}},{{$set:{{daily_like_count:0,rewarded_likes_today:0,rewarded_ads_used_today:0}}}})'],
                   check=True)


def _girl_ids(n):
    out = subprocess.run(["mongosh", "dating_app_db", "--quiet", "--eval",
                          'db.users.find({email:/^girl\\d+@heartlink.test$/},{_id:0,id:1}).limit(%d).toArray().map(u=>u.id).join(",")' % n],
                         capture_output=True, text=True, check=True).stdout.strip()
    return out.split(",")


class TestFreeLikeQuota:
    def test_full_quota_flow(self):
        uid = _login("free.male@heartlink.test")
        _reset("free.male@heartlink.test")
        q = requests.get(f"{BASE_URL}/api/like-quota/{uid}").json()
        assert q["unlimited"] is False and q["likes_remaining"] == 10 and q["rewarded_ads_left"] == 3
        girls = _girl_ids(25)
        for i in range(10):
            r = requests.post(f"{BASE_URL}/api/action/{uid}", json={"target_user_id": girls[i], "action": "like"})
            assert r.status_code == 200, r.text
        r = requests.post(f"{BASE_URL}/api/action/{uid}", json={"target_user_id": girls[10], "action": "like"})
        assert r.status_code == 429
        assert r.json()["detail"]["code"] == "daily_like_limit_reached"
        # passes unlimited
        r = requests.post(f"{BASE_URL}/api/action/{uid}", json={"target_user_id": girls[11], "action": "pass"})
        assert r.status_code == 200
        # rewards x3
        for k in range(3):
            r = requests.post(f"{BASE_URL}/api/like-quota/{uid}/reward")
            assert r.status_code == 200
            assert r.json()["rewarded_ads_left"] == 2 - k
        assert requests.get(f"{BASE_URL}/api/like-quota/{uid}").json()["likes_remaining"] == 15
        r = requests.post(f"{BASE_URL}/api/like-quota/{uid}/reward")
        assert r.status_code == 429 and r.json()["detail"]["code"] == "rewarded_ad_limit_reached"
        _reset("free.male@heartlink.test")


class TestPremiumUnlimited:
    def test_premium_unlimited(self):
        uid = _login("premium.male@heartlink.test")
        q = requests.get(f"{BASE_URL}/api/like-quota/{uid}").json()
        assert q["unlimited"] is True
        girls = _girl_ids(14)
        for g in girls[:12]:
            r = requests.post(f"{BASE_URL}/api/action/{uid}", json={"target_user_id": g, "action": "like"})
            assert r.status_code == 200, r.text
