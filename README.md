# HueFound — K-Means Color Palette Extractor

Upload an image in the browser to extract its five dominant colors with percentages, RGB, and HEX values. The Flask backend uses Pillow, NumPy, and scikit-learn K-Means; the frontend is plain HTML/CSS/JavaScript.

## Deploy to Render (public URL)

1. Create a new GitHub repository and upload **the contents of this folder** to the repository root. `app.py` and `requirements.txt` must be in the root (not inside an extra nested folder).
2. Go to https://dashboard.render.com/ and choose **New > Web Service**, connect your GitHub repo.
3. Select **Python 3** (if a Language selector appears), select the **Free** instance (if available), and leave the Root Directory blank.
4. Set **Build Command** to: `pip install -r requirements.txt`
5. Set **Start Command** to: `gunicorn app:app --workers 1 --threads 2 --timeout 120`
6. Deploy. Render will provide a public `https://<your-service>.onrender.com` address.

The `.python-version` file selects Python 3.12 to avoid unexpected compatibility issues with Render's changing default Python version. `gunicorn` is included in `requirements.txt` as the production HTTP server.

**Note:** Render's free service may spin down after 15 minutes without requests; the next visit can be slow to start.

## Run locally

```bash
python -m pip install -r requirements.txt
python app.py
```

Visit http://127.0.0.1:5000.

## API

`POST /api/analyze` with multipart form field `image`. Returns a JSON object containing `colors` (`hex`, `rgb`, `percentage`). File types: JPEG, PNG, WEBP, GIF, BMP. Max upload: 10 MB.

## Image processing

The image is orientation-corrected, composited against white for transparency, reduced to at most 400 x 400, converted into RGB pixels, then K-Means clusters are fitted. Labels on all resized pixels give approximate color percentages, ordered from most prevalent to least.
