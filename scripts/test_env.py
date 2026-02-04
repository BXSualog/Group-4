import sys
try:
    import cv2
    print("opencv: ok")
except ImportError:
    print("opencv: missing")

try:
    from PIL import Image
    print("pillow: ok")
except ImportError:
    print("pillow: missing")
