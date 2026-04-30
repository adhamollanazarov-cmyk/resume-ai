from io import BytesIO

from fastapi import UploadFile
from PyPDF2 import PdfReader
from PyPDF2.errors import PdfReadError


class PDFParseError(Exception):
    """Raised when text cannot be extracted from an uploaded PDF."""


async def extract_text_from_pdf(file: UploadFile) -> str:
    file_bytes = await file.read()

    if not file_bytes:
        raise PDFParseError("Uploaded PDF is empty.")

    try:
        reader = PdfReader(BytesIO(file_bytes))
    except PdfReadError as exc:
        raise PDFParseError("Uploaded file could not be read as a valid PDF.") from exc

    text = _extract_reader_text(reader)
    if not text:
        raise PDFParseError("No readable text was found in the uploaded PDF.")

    return text


def _extract_reader_text(reader: PdfReader) -> str:
    page_text: list[str] = []

    for page in reader.pages:
        text = page.extract_text()
        if text:
            page_text.append(text.strip())

    return "\n\n".join(page_text).strip()
