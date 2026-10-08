import os
from dotenv import load_dotenv

with open(".env.test", "w") as f:
    f.write("FOO=bar")

load_dotenv(".env.test")
print("First load:", os.environ.get("FOO"), os.environ.get("BAZ"))

with open(".env.test", "a") as f:
    f.write("\nBAZ=qux")

load_dotenv(".env.test")
print("Second load:", os.environ.get("FOO"), os.environ.get("BAZ"))
