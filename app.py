"""Flask API and web UI for K-Means dominant color extraction."""
from io import BytesIO

import numpy as np
from flask import Flask, jsonify, render_template, request
from PIL import Image, ImageOps, UnidentifiedImageError
from sklearn.cluster import KMeans

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB upload maximum

ALLOWED_FORMATS = {'JPEG', 'PNG', 'WEBP', 'GIF', 'BMP'}
MAX_IMAGE_PIXELS = 25_000_000
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


def extract_palette(image_bytes: bytes, n_colors: int = 5) -> list[dict]:
    """Fit K-Means to image pixels and return sorted dominant colors.

    Images are resized to fit within 400x400 for predictable CPU usage.
    Each pixel is assigned to its nearest centroid to calculate percentages.
    """
    with Image.open(BytesIO(image_bytes)) as source:
        if source.format not in ALLOWED_FORMATS:
            raise ValueError('Please upload a JPG, PNG, WEBP, GIF, or BMP image.')
        image = ImageOps.exif_transpose(source)
        # Use a white background for transparent areas.
        rgba = image.convert('RGBA')
        background = Image.new('RGBA', rgba.size, (255, 255, 255, 255))
        image = Image.alpha_composite(background, rgba).convert('RGB')
        image.thumbnail((400, 400), Image.Resampling.LANCZOS)
        pixels = np.asarray(image, dtype=np.uint8).reshape(-1, 3)

    unique_colors = np.unique(pixels, axis=0)
    clusters = min(n_colors, len(unique_colors))
    if clusters == 0:
        raise ValueError('This image contains no usable pixels.')

    # Random subset for fitting; percentages are measured over *all* resized pixels.
    rng = np.random.default_rng(42)
    sample = pixels if len(pixels) <= 12_000 else pixels[rng.choice(len(pixels), 12_000, replace=False)]
    model = KMeans(n_clusters=clusters, random_state=42, n_init=10)
    model.fit(sample)
    labels = model.predict(pixels)
    counts = np.bincount(labels, minlength=clusters)
    order = np.argsort(-counts, kind='stable')

    result = []
    for idx in order:
        rgb = np.clip(np.rint(model.cluster_centers_[idx]), 0, 255).astype(int).tolist()
        result.append({
            'hex': '#{:02X}{:02X}{:02X}'.format(*rgb),
            'rgb': rgb,
            'percentage': round(float(counts[idx]) / len(pixels) * 100, 2),
        })
    return result


@app.get('/')
def home():
    return render_template('index.html')


@app.post('/api/analyze')
def analyze():
    file = request.files.get('image')
    if file is None or not file.filename:
        return jsonify(error='Choose an image to analyze.'), 400
    try:
        contents = file.read()
        if not contents:
            return jsonify(error='The uploaded image is empty.'), 400
        palette = extract_palette(contents)
        return jsonify(colors=palette, count=len(palette))
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        message = str(exc) if isinstance(exc, ValueError) else 'This file is not a valid supported image.'
        return jsonify(error=message), 400


@app.errorhandler(413)
def too_large(_error):
    return jsonify(error='The image must be smaller than 10 MB.'), 413


if __name__ == '__main__':
    app.run(debug=True)
