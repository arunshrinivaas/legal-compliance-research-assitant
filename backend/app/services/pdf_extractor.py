import pymupdf


def extract_text_from_pdf(file_path: str) -> str:
    document = pymupdf.open(file_path)

    pages_text: list[str] = []

    for page in document:
        page_text = page.get_text("text")
        pages_text.append(page_text)

    document.close()

    return "\n".join(pages_text)