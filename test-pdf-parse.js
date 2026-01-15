// Test PDF parsing
const testPdfParse = async () => {
  const SUPABASE_URL = 'https://huaaogdxxdcakxryecnw.supabase.co';
  const PDF_URL = 'https://huaaogdxxdcakxryecnw.supabase.co/storage/v1/object/public/travel-documents/1767197640822_RRP-9033.pdf';

  console.log('🧪 Testing PDF download...');

  try {
    // Test 1: Can we download the PDF?
    const pdfResponse = await fetch(PDF_URL);
    console.log('📄 PDF Response status:', pdfResponse.status);

    if (pdfResponse.ok) {
      const blob = await pdfResponse.blob();
      console.log('✅ PDF downloaded, size:', blob.size, 'bytes');

      // Test 2: Can we read it as array buffer?
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      console.log('✅ PDF converted to bytes, first 10 bytes:', Array.from(uint8Array.slice(0, 10)));

      // Test 3: Is it a valid PDF?
      const header = String.fromCharCode(...uint8Array.slice(0, 5));
      console.log('📋 PDF Header:', header);

      if (header === '%PDF-') {
        console.log('✅ Valid PDF file');
      } else {
        console.log('❌ Not a valid PDF file');
      }
    } else {
      console.log('❌ Failed to download PDF');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

testPdfParse();
