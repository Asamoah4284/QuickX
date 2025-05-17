import { useParams } from 'react-router-dom';

function BookDetails() {
  const { bookId } = useParams();

  return (
    <div className="book-details">
      <h1>Book Details</h1>
      {/* Add book details content here */}
    </div>
  );
}

export default BookDetails; 