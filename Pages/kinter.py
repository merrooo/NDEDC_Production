import cv2
import numpy as np
import pytesseract
from tkinter import Tk, filedialog
import re
import os

# -------------------------------
# 1. Configure Tesseract path
# -------------------------------
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def select_image_file():
    """Open file dialog to choose an image"""
    root = Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(
        title="Select image containing the number",
        filetypes=[("Image files", "*.png *.jpg *.jpeg *.bmp *.tiff")]
    )
    root.destroy()
    return file_path

def preprocess_for_ocr(img):
    """
    Optimized for thin, vertical digits on SIM cards/labels.
    """
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Upscale for better OCR accuracy (Tesseract likes larger text)
    gray = cv2.resize(gray, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)

    # Use Adaptive Thresholding (Better than Otsu for uneven lighting)
    # This creates a clean black and white image
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 11, 2
    )

    # Clean up small noise dots
    kernel = np.ones((2, 2), np.uint8)
    processed = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)

    # Optional: Slightly thicken the numbers if they are too thin
    processed = cv2.dilate(processed, kernel, iterations=1)

    # Invert back: Tesseract works best with Black Text on White Background
    final = cv2.bitwise_not(processed)
    
    return final

def detect_number_from_roi(image_path):
    # Load image
    img = cv2.imread(image_path)
    if img is None:
        print("❌ Error: Could not read image")
        return None

    # Show image and let user select ROI
    print("📌 Select the number area. Press ENTER or SPACE to confirm.")
    roi = cv2.selectROI("Select number area", img, showCrosshair=True, fromCenter=False)
    cv2.destroyWindow("Select number area")

    if roi[2] == 0 or roi[3] == 0:
        print("❌ No area selected. Exiting.")
        return None

    x, y, w, h = roi
    cropped = img[y:y+h, x:x+w]

    # --- CRITICAL FIX FOR YOUR IMAGE ---
    # If height is much greater than width, the text is vertical. Rotate it!
    if h > w:
        print("🔄 Vertical text detected. Rotating 90 degrees...")
        cropped = cv2.rotate(cropped, cv2.ROTATE_90_COUNTERCLOCKWISE)

    # Run the pre-processing
    processed = preprocess_for_ocr(cropped)

    # Show the debug image so you can see what Tesseract sees
    cv2.imshow("What Tesseract Sees", processed)
    cv2.waitKey(2000) # Show for 2 seconds
    cv2.destroyAllWindows()

    # Tesseract Config: 
    # PSM 7: Treat the image as a single text line.
    # Whitelist: Only look for numbers.
    custom_config = r'--oem 3 --psm 7 -c tessedit_char_whitelist=0123456789'
    
    text = pytesseract.image_to_string(processed, config=custom_config)

    # Clean the result to ensure only digits are returned
    numbers = re.sub(r'[^0-9]', '', text)
    return numbers

if __name__ == "__main__":
    img_path = select_image_file()
    
    if img_path:
        result = detect_number_from_roi(img_path)
        if result:
            print("-" * 30)
            print(f"✅ Detected number: {result}")
            # Target ICCID from your image: 89204011243006169
            if "89204011243006169" in result:
                print("🎉 Perfect Match!")
            print("-" * 30)
        else:
            print("❌ No number detected. Try cropping tighter to the numbers.")
    else:
        print("No file selected.")