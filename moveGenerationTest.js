
function move(fromFile,fromRank,toFile,toRank,promotionPiece) {
	promotionPiece = promotionPiece | 0;
	return (fromFile) | (fromRank << 3) | (toFile << 6) | (toRank << 9) | (promotionPiece << 12);
}

var moveGenerationTests = [
	
	function mustGeneratePawnMoves() {
		// Arrange
		var b = new Board();
		b.setPiece(0, 1, WHITE|PAWN);
		
		// Act
		var moves = b.getMovesAt(0,1);

		// Assert
		assertEquals(2, moves.length);
		assertContains(move(0,1,0,2), moves);
		assertContains(move(0,1,0,3), moves);
	},

	function mustNotGeneratePawnMoveTwoForwardIfNotOnHomeRow(){
		// Arrange
		var b = new Board();
		b.setPiece(0, 2, WHITE|PAWN);
		
		// Act
		var moves = b.getMovesAt(0,2);

		// Assert
		assertEquals(1, moves.length);
		assertContains(move(0,2,0,3), moves);
	},

	function mustGenerateWhitePawnAttackRight() {
		// Arrange
		var b = new Board();
		var f = 3;
		var r = 3;
		b.setPiece(f, r, WHITE|PAWN);
		b.setPiece(f+1, r+1, PAWN);
		
		// Act
		var moves = b.getMovesAt(f,r);

		// Assert
		assertEquals(2, moves.length);
		assertContains(move(f,r, f+1,r+1), moves);
		assertContains(move(f,r, f,r+1), moves);
	},

	function mustGenerateWhitePawnAttackLeft() {
		// Arrange
		var b = new Board();
		var f = 3;
		var r = 3;
		b.setPiece(f, r, WHITE|PAWN);
		b.setPiece(f-1, r+1, PAWN);
		
		// Act
		var moves = b.getMovesAt(f,r);

		// Assert
		assertEquals(2, moves.length);
		assertContains(move(f,r, f-1,r+1), moves);
		assertContains(move(f,r, f,r+1), moves);
	},

	function mustGenerateWhiteEnPassantAttack(){
		// Arrange
		var b = new Board();
		b.setPiece(3,6, PAWN);
		b.setPiece(2,4, WHITE|PAWN);
		b.toggleTurn();
		b.move(3,6,3,4); // move pawn 2 forward

		// Act
		var moves = b.getMovesAt(2,4);
		
		// Assert
		assertContains(move(2,4, 3,5), moves, "Expected possible white en passant attack");
	},

	function mustGenerateBlackEnPassantAttack(){
		// Arrange
		var b = new Board();
		b.setPiece(3,1, WHITE|PAWN);
		b.setPiece(4,3, PAWN);
		b.move(3,1,3,3); // move pawn 2 forward

		// Act
		var moves = b.getMovesAt(4,3);
		
		// Assert
		assertContains(move(4,3, 3,2), moves, "Expected possible black en passant attack");
	},

	function mustGenerateRookMoves() {
		// Arrange
		var b = new Board();
		b.setPiece(0,0, WHITE|ROOK);
		b.setPiece(7,7, ROOK);
		
		// Act
		var whiteMoves = b.getMovesAt(0,0);
		var blackMoves = b.getMovesAt(7,7);

		// Assert
		var e = "Expected possible rook move";
		for (var i = 1; i < 7; i++) {
			assertContains(move(0,0, 0,i), whiteMoves, e);
			assertContains(move(0,0, i,0), whiteMoves, e);

			assertContains(move(7,7, 7,i), blackMoves, e);
			assertContains(move(7,7, i,7), blackMoves, e);
		}
	},
	
	function mustGenerateRookAttacks(){
		// Arrange
		var b = new Board();
		b.setPiece(3,3, WHITE|ROOK);
		b.setPiece(3,1, PAWN);
		b.setPiece(3,6, PAWN);
		b.setPiece(2,3, PAWN);
		b.setPiece(7,3, PAWN);

		// Act
		var moves = b.getMovesAt(3,3);

		// Assert
		var e = "Expected possible pawn attack";
		assertContains(move(3,3, 3,1), moves);
		assertContains(move(3,3, 3,6), moves);
		assertContains(move(3,3, 2,3), moves);
		assertContains(move(3,3, 7,3), moves);
	},

	function rookMustNotCaptureOwnPieces(){
		// Arrange
		var b = new Board();
		b.setPiece(3,3, WHITE|ROOK);
		b.setPiece(3,1, WHITE|PAWN);
		b.setPiece(3,6, WHITE|PAWN);
		b.setPiece(2,3, WHITE|PAWN);
		b.setPiece(7,3, WHITE|PAWN);

		// Act
		var moves = b.getMovesAt(3,3);

		// Assert
		var e = "Must not be able to capture own pieces"
		assertNotContains(move(3,3, 3,1), moves, e);
		assertNotContains(move(3,3, 3,6), moves, e);
		assertNotContains(move(3,3, 2,3), moves, e);
		assertNotContains(move(3,3, 7,3), moves, e);
	},

	function rookMustNotPassOwnPieces(){
		// Arrange
		var b = new Board();
		b.setPiece(3,3, WHITE|ROOK);
		b.setPiece(3,2, WHITE|PAWN);
		b.setPiece(3,4, WHITE|PAWN);
		b.setPiece(2,3, WHITE|PAWN);
		b.setPiece(4,3, WHITE|PAWN);

		// Act
		var moves = b.getMovesAt(3,3);

		// Assert
		var e = "Must not be able to pass own pieces"
		assertNotContains(move(3,3, 3,1), moves, e);
		assertNotContains(move(3,3, 3,5), moves, e);
		assertNotContains(move(3,3, 1,3), moves, e);
		assertNotContains(move(3,3, 5,3), moves, e);
	},

	function testTemplate() {
		// Arrange
		
		// Act

		// Assert
	}
];

addTests(moveGenerationTests);
