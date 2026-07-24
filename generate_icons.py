from PIL import Image, ImageDraw, ImageFont
import os

def generate_icon(size, output_path):
    # Create a new image with orange background
    img = Image.new('RGBA', (size, size), (255, 149, 0, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw a white circle in the center
    margin = size // 8
    draw.ellipse([margin, margin, size - margin, size - margin], fill=(255, 255, 255, 255))
    
    # Draw the letter "A" in orange
    try:
        # Try to use a system font
        font_size = size // 2
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except:
            font = ImageFont.load_default()
    
    text = "A"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - size // 10
    
    draw.text((x, y), text, fill=(255, 149, 0, 255), font=font)
    
    # Save the image
    img.save(output_path, 'PNG')
    print(f"Generated {output_path}")

# Icon sizes needed for PWA
sizes = [72, 96, 128, 144, 152, 192, 384, 512]
icons_dir = "icons"

for size in sizes:
    output_path = os.path.join(icons_dir, f"icon-{size}x{size}.png")
    generate_icon(size, output_path)

print("All icons generated successfully!")
