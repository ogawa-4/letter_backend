import os
import psycopg2
from fastapi import FastAPI
from pydantic import BaseModel #データ検証ライブラリ。データの整合性チェック。
from fastapi.middleware.cors import CORSMiddleware #CORSミドルウェア。異なるオリジン間のリクエストを許可するためのもの。

app=FastAPI() #FastAPIのインスタンスを作成

#CORSミドルウェアを追加。フロントエンドとバックエンドの通信を許可するための設定。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], #許可するオリジン。フロントエンドのURL。
    allow_credentials=True,
    allow_methods=["*"], #許可するHTTPメソッド。全てのメソッドを許可。
    allow_headers=["*"], #許可するHTTPヘッダー。全てのヘッダーを許可。
)

@app.get("/")
def read_root():
    return {"message": "Hello, world!"}

#リクエストのデータ構造を定義するクラス。
#Pydanticを使って、データの形を定義。
class Letter(BaseModel):
    content: str
    latitude: float
    longitude: float

# データベースとのコネクションを確立
DATABASE_URL=os.environ.get("DATABASE_URL")
conn = psycopg2.connect(DATABASE_URL, sslmode='require')

@app.post("/letters/")
def create_letter(letter: Letter):
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO letter (content, gps)
            VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography)
        """, (letter.content, letter.longitude, letter.latitude))
        conn.commit()
    except Exception as e:
        conn.rollback()  # トランザクションをリセット
        return {"error": str(e)}
    finally:
        cur.close()
    return {"message": "手紙を残したよ！"}


#GETリクエストで手紙の情報を取得するエンドポイント。
@app.get("/letters/")
def get_letters():
    cur=conn.cursor()
    #データベースから手紙の情報を取得するSQLクエリ。経度がX、緯度がY。
    cur.execute("SELECT id, content, date_time, ST_X(gps::geometry), ST_Y(gps::geometry) FROM letter")
    rows=cur.fetchall()#結果をまとめて取得してrowsに格納している。
    cur.close()
    # データベースから取得した手紙の情報を扱いやすいjson形式に変換。
    letters=[
        {
            "id": row[0],
            "content": row[1],
            "date_time": row[2],
            "longitude": row[3],
            "latitude": row[4]
        }
        for row in rows
    ]
    return {"letters": letters}

#GETリクエストで近くの手紙を取得するエンドポイント。
#引数として、緯度、経度、最大距離を受け取る。'max_distance'は半径何メートルまでの手紙を取得するか。
@app.get("/nearby_letters/")
def get_nearby_letters(latitude: float, longitude: float, max_distance: float = 100.0): 
    cur=conn.cursor()

    #ST_SetSRID(ST_MakePoint())で緯度経度から場所の点を作成。
    #ST_DWithinで指定した距離内にあるかどうかをチェック。
    #ST_Distanceで距離を計算。
    cur.execute("""
                SELECT id, content, date_time, ST_X(gps::geometry), ST_Y(gps::geometry),
                ST_Distance(gps, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography) AS distance FROM letter
                WHERE ST_DWithin(gps, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
                """,(longitude, latitude, longitude, latitude, max_distance))
    
    rows=cur.fetchall()
    cur.close()

    # データベースから取得した手紙の情報を辞書形式に変換。
    letters=[
        {
            "id": row[0],
            "content": row[1],
            "date_time": row[2],
            "longitude": row[3],
            "latitude": row[4],
            "distance": row[5]
        }
        for row in rows
    ]
    return {"letters": letters}
