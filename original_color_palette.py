
import cv2
import numpy as np
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans

image = cv2.imread("img/test2.jpeg")

if image is None:
    raise FileNotFoundError("Image not found. Check the image path.")

image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
pixels = image.reshape(-1, 3)

kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
labels = kmeans.fit_predict(pixels)

colors = kmeans.cluster_centers_.astype(int)

counts = np.bincount(labels, minlength=5)

sorted_indices = np.argsort(counts)[::-1]
colors = colors[sorted_indices]
counts = counts[sorted_indices]
color_bar = np.zeros((100, 500, 3), dtype=np.uint8)

for i, color in enumerate(colors):
    color_bar[:, i * 100:(i + 1) * 100] = color
plt.figure(figsize=(12, 5))

plt.subplot(1, 2, 1)
plt.imshow(image)
plt.title("Original Image")
plt.axis("off")

plt.subplot(1, 2, 2)
plt.imshow(color_bar)
plt.title("Top 5 Dominant Colors")
plt.axis("off")

plt.tight_layout()
plt.show()


for i, (color, count) in enumerate(zip(colors, counts)):
    percentage = count / len(pixels) * 100
    print(f"Color {i+1}: RGB{tuple(color)} - {percentage:.2f}%")
