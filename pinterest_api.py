import sys
import json
from pinterest_downloader import Pinterest


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "ok": False,
            "error": "Pinterest URL is required"
        }))
        return

    url = sys.argv[1]

    try:
        pinterest = Pinterest()
        result = pinterest.get_pin(url)

        print(json.dumps(result, ensure_ascii=True))

    except Exception as e:
        print(json.dumps({
            "ok": False,
            "error": str(e)
        }))


if __name__ == "__main__":
    main()