import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import axios from 'axios';
import { fabric } from 'fabric';
import { ImageService } from '../image.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  otherDataForm: FormGroup;
  imageData!: { name: string; content: string };
  images: any[] = [];
  fabricCanvas: fabric.Canvas | null = null;
  constructor(
    private formBuilder: FormBuilder,
    private imageService: ImageService
  ) {
    this.otherDataForm = this.formBuilder.group({
      width: null,
      height: null,
      horizontalLines: [0],
      verticalLines: [0],
      selectedAreaNumber: null,
      horizontalDistances: this.formBuilder.group({}),
      verticalDistances: this.formBuilder.group({}),
    });
  }

  ngOnInit(): void {
    this.addMaxValueListeners('width', 1000);
    this.addMaxValueListeners('height', 1000);
    this.addMaxValueListeners('horizontalLines', 1000);
    this.addMaxValueListeners('verticalLines', 1000);
    // Subscribe to valueChanges observable of horizontalLines form control
    this.otherDataForm
      .get('horizontalLines')
      ?.valueChanges.subscribe((value) => {
        // Call addHorizontalDistances() with the new value of horizontalLines form control
        this.addHorizontalDistances(value);
      });

    // Subscribe to valueChanges observable of verticalLines form control
    this.otherDataForm.get('verticalLines')?.valueChanges.subscribe((value) => {
      // Call addVerticalDistances() with the new value of verticalLines form control
      this.addVerticalDistances(value);
    });

    // Subscribe to valueChanges observable of otherDataForm and call drawRectangle() method when any value changes.
    this.otherDataForm.valueChanges.subscribe(() => {
      this.drawRectangle();
    });
  }
  loadImages() {
    const table = document.getElementById('table');
    table?.classList.remove('hidden');

    this.imageService.getImages().subscribe(
      (data) => {
        this.images = data;
      },
      (error) => {
        console.error('Veri alma hatası:', error);
      }
    );
  }

  // Fonksiyonu bileşeninizin içerisinde uygun bir yerde tanımlayın
  get(image: any) {
    // Resim verilerini JSON formatına dönüştür

    // İlgili form kontrol gruplarını alın
    const widthControl = this.otherDataForm.get('width');
    const heightControl = this.otherDataForm.get('height');
    const horizontalLinesControl = this.otherDataForm.get('horizontalLines');
    const selectedAreaNumberControl =
      this.otherDataForm.get('selectedAreaNumber');
    const verticalLinesControl = this.otherDataForm.get('verticalLines');

    const verticalDistancesControl =
      this.otherDataForm.get('verticalDistances');
    const horizontalDistancesControl = this.otherDataForm.get(
      'horizontalDistances'
    );
    // İlgili form kontrol gruplarına resim verilerini doldurun
    widthControl?.setValue(image.width);
    heightControl?.setValue(image.height);
    horizontalLinesControl?.setValue(image.horizontalLines);
    selectedAreaNumberControl?.setValue(image.selectedAreaNumber);
    verticalLinesControl?.setValue(image.verticalLines);
    horizontalDistancesControl?.setValue(image.horizontalDistances);
    verticalDistancesControl?.setValue(image.verticalDistances);
  }

  addMaxValueListeners(controlName: string, maxValue: number): void {
    const control = this.otherDataForm.get(controlName);
    const inputElement = document.getElementById(controlName);

    if (control && inputElement) {
      inputElement.addEventListener('input', () => {
        if (control.value > maxValue) {
          control.patchValue(maxValue);
        }
      });
    }
  }
  ngAfterViewInit(): void {
    // Set initial size of canvas element.
    const canvas = this.canvas.nativeElement;
    canvas.width = 800;
    canvas.height = 600;
    let width = this.otherDataForm.value.width;
    let height = this.otherDataForm.value.height;
    // Create a new fabric.Canvas instance and set its dimensions
    const canvasElement = this.canvas.nativeElement;
    this.fabricCanvas = new fabric.Canvas(canvasElement);
    this.fabricCanvas.setDimensions({
      width: canvas.width,
      height: canvas.height,
    });

    // Set a minimum scale value
    const minScale = 0.5;

    // Calculate the scale factor based on the desired width and height of the rectangle
    let scale = Math.min(canvas.width / width, canvas.height / height);

    // Ensure that the scale factor is not less than the minimum scale value
    scale = Math.max(minScale, scale);

    // Scale the canvas using the fabric.Canvas.setZoom() method
    this.fabricCanvas.setZoom(scale);
  }

  onSubmit(): void {
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Reset the form
    this.otherDataForm.reset();
  }

  getLinesArray(lineCount: number): number[] {
    return Array(lineCount)
      .fill(0)
      .map((_, index) => index + 1);
  }

  addHorizontalDistances(count: number): void {
    const horizontalDistances = this.otherDataForm.get(
      'horizontalDistances'
    ) as FormGroup;
    horizontalDistances.reset();
    for (let i = 0; i < count; i++) {
      horizontalDistances.addControl(
        `distance_${i}`,
        this.formBuilder.control(null)
      );
    }
  }

  addVerticalDistances(count: number): void {
    const verticalDistances = this.otherDataForm.get(
      'verticalDistances'
    ) as FormGroup;
    verticalDistances.reset();
    for (let i = 0; i < count; i++) {
      verticalDistances.addControl(
        `distance_${i}`,
        this.formBuilder.control(null)
      );
    }
  }

  drawRectangle(): void {
    let width = this.otherDataForm.value.width;
    let height = this.otherDataForm.value.height;
    const horizontalDistances = this.otherDataForm.value.horizontalDistances;
    const verticalDistances = this.otherDataForm.value.verticalDistances;
    if (!width || !height) return;
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scale down rectangle and text if necessary
    let scale = 1;
    if (width > canvas.width - 20 || height > canvas.height - 20) {
      scale = Math.max(
        0.1,
        Math.min((canvas.width - 20) / width, (canvas.height - 20) / height)
      );
      width *= scale;
      height *= scale;

      // Scale relative to center of canvas
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-canvas.width / (2 * scale), -canvas.height / (2 * scale));
    }

    const offsetX = (canvas.width / scale - width) / 2;
    const offsetY = (canvas.height / scale - height) / 2;

    ctx.beginPath();
    ctx.rect(offsetX, offsetY, width, height);
    ctx.stroke();

    ctx.font = '16px sans-serif';

    // Ensure text stays within canvas
    let textWidth = ctx.measureText(`Width: ${width / scale}mm`).width;
    let textX = Math.min(
      width + 20 + offsetX,
      (canvas.width - textWidth - 10) / scale
    );

    // Position text next to bottom side of rectangle
    ctx.fillText(
      `Width: ${width / scale}mm`,
      width / (2 * scale) + offsetX - textWidth / 2,
      height + offsetY + 20
    );

    textWidth = ctx.measureText(`Height: ${height / scale}mm`).width;
    let textY = Math.min(
      height + 30 + offsetY - 10, // Decrease 10 pixels to add some space
      (canvas.height - textWidth - 10) / scale
    );

    // Position text next to right side of rectangle
    ctx.save(); // Save current canvas state

    // Rotate canvas 90 degrees clockwise
    ctx.translate(width + offsetX + 20, height / (2 * scale) + offsetY);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(`Height: ${height / scale}mm`, 0, 0);

    ctx.restore(); // Restore canvas state

    // Oda numaralarının yazılacağı font ve renk
    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'black';

    // Yatay çizgilerin koordinatlarını tutan bir dizi
    const horizontalLines: number[] = [offsetY]; // Dikdörtgenin üst kenarını ekle

    // Dikey çizgilerin koordinatlarını tutan bir dizi
    const verticalLines: number[] = [offsetX]; // Dikdörtgenin sol kenarını ekle

    // Metni yatay olarak ortalamak için textAlign özelliğini "center" olarak ayarla
    ctx.textAlign = 'center';

    // Yatay çizgileri ve koordinatlarını çiz
    let currentY = offsetY;
    for (const key in horizontalDistances) {
      const distance = horizontalDistances[key];
      if (distance !== null) {
        currentY += distance;
        const isBeyondBounds = currentY > height + offsetY;
        ctx.beginPath();
        ctx.moveTo(offsetX, currentY);
        ctx.lineTo(width + offsetX, currentY);
        ctx.strokeStyle = isBeyondBounds ? 'red' : 'black';
        ctx.stroke();
        textWidth = ctx.measureText(`${distance}mm`).width;
        textX = Math.min(
          width + Math.max(20, textWidth) + offsetX,
          (canvas.width - textWidth - 10) / scale
        );
        ctx.fillStyle = isBeyondBounds ? 'red' : 'black';
        ctx.fillText(`${distance}mm`, textX, currentY);

        // Yatay çizginin y koordinatını diziye ekle
        horizontalLines.push(currentY);
      }
    }
    horizontalLines.push(height + offsetY); // Dikdörtgenin alt kenarını ekle

    // Dikey çizgileri ve koordinatlarını çiz
    let currentX = offsetX;
    for (const key in verticalDistances) {
      const distance = verticalDistances[key];
      if (distance !== null) {
        currentX += distance;
        const isBeyondBounds = currentX > width + offsetX;
        ctx.beginPath();
        ctx.moveTo(currentX, offsetY);
        ctx.lineTo(currentX, height + offsetY);
        ctx.strokeStyle = isBeyondBounds ? 'red' : 'black';
        ctx.stroke();
        textWidth = ctx.measureText(`${distance}mm`).width;
        textY = Math.min(
          height + Math.max(30, textWidth) + offsetY,
          (canvas.height - textWidth - 10) / scale
        );
        ctx.fillStyle = isBeyondBounds ? 'red' : 'black';

        // Position text below center of line
        ctx.fillText(
          `${distance}mm`,
          currentX - textWidth / 2,
          height + offsetY + 20
        );

        // Dikey çizginin x koordinatını diziye ekle
        verticalLines.push(currentX);
      }
    }
    verticalLines.push(width + offsetX); // Dikdörtgenin sağ kenarını ekle
    // Oda numaralarını al
    let selectedAreaNumber = (
      document.getElementById('selectedAreaNumber') as HTMLInputElement | null
    )?.value;

    // Her oda için bir numara yaz
    let roomNumber = 1; // Oda numarasını tutan değişken
    let selectedAreaX = 0; // Seçilen oda numarasına ait x koordinatını tutan değişken
    let selectedAreaY = 0; // Seçilen oda numarasına ait y koordinatını tutan değişken
    let selectedAreaWidth = 0; // Seçilen oda numarasına ait genişliği tutan değişken
    let selectedAreaHeight = 0; // Seçilen oda numarasına ait yüksekliği tutan değişken
    for (let i = 0; i < horizontalLines.length - 1; i++) {
      // Son elemanı atla
      for (let j = 0; j < verticalLines.length - 1; j++) {
        // Son elemanı atla
        // Oda numarasını metin olarak al
        const number = roomNumber.toString();

        // Metnin genişliğini ve yüksekliğini ölç
        const textWidth = ctx.measureText(number).width;
        const textHeight = parseInt(ctx.font);

        // Metnin yazılacağı x ve y koordinatlarını hesapla
        // x koordinatı, dikey çizginin ortasına denk gelir
        // y koordinatı, yatay çizginin üzerine metnin yüksekliğinin yarısı kadar uzaklıkta olur

        // Eğer ilk satır veya sütun ise, dikdörtgenin kenarından başla
        let x =
          j === 0 ? offsetX + textWidth / 2 : verticalLines[j] + textWidth / 2;

        let y =
          i === horizontalLines.length - 1
            ? height + offsetY - textHeight / 2
            : horizontalLines[i] - textHeight / 2;

        // Oda genişliğini ve yüksekliğini hesapla
        const roomWidth = verticalLines[j + 1] - verticalLines[j];
        const roomHeight = horizontalLines[i + 1] - horizontalLines[i];
        // Eğer oda numarası seçilen oda numarasına eşitse, x ve y koordinatlarını ve genişlik ve yüksekliği kaydet
        if (number === selectedAreaNumber) {
          // selectedAreaX değerini dikey çizginin x koordinatı olarak ata
          selectedAreaX = verticalLines[j];
          // selectedAreaY değerini yatay çizginin y koordinatı olarak ata
          selectedAreaY = horizontalLines[i];
          selectedAreaWidth = roomWidth;
          selectedAreaHeight = roomHeight;
        }

        // Metnin x ve y koordinatlarına oda genişliğinin ve yüksekliğinin yarısını ekle
        x += roomWidth / 2;
        y += roomHeight / 2;

        // Metnin x ve y koordinatlarına küçük bir düzeltme faktörü ekle
        const correctionX = -2; // Bu değer değiştirilebilir
        const correctionY = 4; // Bu değer değiştirilebilir
        x += correctionX;
        y += correctionY;

        // Metni yaz
        ctx.fillText(number, x, y);

        // Upload edilen resmi canvas üzerine çiz
        const fileInput = document.getElementById(
          'imageUpload'
        ) as HTMLInputElement;
        if (fileInput && fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          const reader = new FileReader();

          reader.onload = () => {
            const image = new Image();
            image.onload = () => {
              // Draw the image on the canvas
              if (number === selectedAreaNumber) {
                ctx.drawImage(
                  image,
                  selectedAreaX,
                  selectedAreaY,
                  selectedAreaWidth,
                  selectedAreaHeight
                );
              }
            };

            // Set the source of the image to the loaded file
            image.src = reader.result as string;
          };

          // Read the selected file as a data URL
          reader.readAsDataURL(file);
        }

        // Oda numarasını arttır
        roomNumber++;
      }
    }

    // Reset canvas context
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  fileChangeEvent = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (files && files.length > 0) {
      const file = files[0];
      const content = await this.readFileContent(file);

      // imageData'yı bir değişkende sakla
      this.imageData = { name: file.name, content: content };

      const element = document.getElementById('isImageUploaded');
      element?.classList.remove('hidden');
    }
  };

  readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const content = reader.result as string;
        resolve(content);
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsDataURL(file);
    });
  };

  sendToServer = async (): Promise<void> => {
    const inputData: {
      width: string;
      height: string;
      horizontalLines: string;
      selectedAreaNumber: string;
      verticalLines: string;
      imageData: { name: string; content: string };
      horizontalDistances: string[]; // String tipinde bir yatay mesafe dizisi tanımla
      verticalDistances: string[]; // String tipinde bir dikey mesafe dizisi tanımla
    } = {
      width:
        (document.getElementById('width') as HTMLInputElement)?.value || '',
      height:
        (document.getElementById('height') as HTMLInputElement)?.value || '',
      horizontalLines:
        (document.getElementById('horizontalLines') as HTMLInputElement)
          ?.value || '',
      selectedAreaNumber:
        (document.getElementById('selectedAreaNumber') as HTMLInputElement)
          ?.value || '',
      verticalLines:
        (document.getElementById('verticalLines') as HTMLInputElement)?.value ||
        '',
      ['imageData']: this.imageData, // imageData'ya index signature ile erişim sağla
      horizontalDistances: [], // Boş bir yatay mesafe dizisi oluştur
      verticalDistances: [], // Boş bir dikey mesafe dizisi oluştur
    };

    if (
      Number(inputData.horizontalLines) >= 0 &&
      this.otherDataForm.get('horizontalDistances')
    ) {
      const horizontalDistances = this.otherDataForm.get('horizontalDistances');

      if (horizontalDistances instanceof FormGroup) {
        const distanceControls = Object.keys(horizontalDistances.controls);
        for (let i = 0; i < distanceControls.length; i++) {
          const distanceControl = horizontalDistances.get('distance_' + i);
          if (distanceControl) {
            inputData.horizontalDistances.push(distanceControl.value); // Yatay mesafe dizisine ekle
          }
        }
      }
    }

    if (
      Number(inputData.verticalLines) >= 0 &&
      this.otherDataForm.get('verticalDistances')
    ) {
      const verticalDistances = this.otherDataForm.get('verticalDistances');

      if (verticalDistances instanceof FormGroup) {
        const distanceControls = Object.keys(verticalDistances.controls);
        for (let i = 0; i < distanceControls.length; i++) {
          const distanceControl = verticalDistances.get('distance_' + i);
          if (distanceControl) {
            inputData.verticalDistances.push(distanceControl.value); // Dikey mesafe dizisine ekle
          }
        }
      }
    }

    const image = inputData['imageData'] as { name: string; content: string };
    if (!image || !image.name || !image.content) {
      console.log('Resim bilgileri eksik. İstek gönderilemedi.');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:3000/api/images',
        inputData
      );
      console.log('Veri sunucuya gönderildi:', response.data);
      alert('Veriler başarıyla kaydedildi'); // Kaydetme başarılı ise alert göster
    } catch (error) {
      console.error('Sunucuya veri gönderme hatası:', error);
      alert('Kaydederken sorun oluştu'); // Kaydetme başarısız ise alert göster
    }
  };
}
