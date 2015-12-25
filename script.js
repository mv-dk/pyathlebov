//// vars
var BLACK = 0;
var WHITE = 8;

var EMPTY = 0;
var PAWN = 1;
var KNIGHT = 2;
var BISHOP = 3;
var ROOK = 4;
var QUEEN = 5;
var KING = 6;

function Board(array, redrawCallback){
    this.array = array || new Array();
    this.history = new Array();
    this.turn = WHITE;
    this.enPassant = 0;
    this.redrawCallback = redrawCallback || function () {};
	this.whiteLongCastlingEnabled = true;
	this.whiteShortCastlingEnabled = true;
	this.blackLongCastlingEnabled = true;
	this.blackShortCastlingEnabled = true;
	
	// Call the constructor
	this.constructor();
}

Board.prototype.constructor = function(){
    if (this.array.length == 0) {
        for(var i = 0; i < 64; i++) { this.array[i] = 0; }
    }
};

Board.prototype.setUpInitialPosition = function() {
    var arr = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];
    for (var f = 0; f < 8; f++) { 
        this.setPiece(f,0, arr[f] | WHITE);
        this.setPiece(f,1, PAWN | WHITE);
        this.setPiece(f,6, PAWN | BLACK);
        this.setPiece(f,7, arr[f] | BLACK);
    }
    this.redrawCallback();
};

Board.prototype.pieceAt = function (file,rank) {
    return this.array[idx(file,rank)];
};

// returns true if move is valid, false otherwise
Board.prototype.validateMove = function (fromFile, fromRank, toFile, toRank) {
	var validMoves = this.getMovesAt(fromFile,fromRank);
	var m = (fromFile) | (fromRank<<3) | (toFile<<6) | (toRank<<9);
	for (var i = 0; i < validMoves.length; i++) {
		if (validMoves[i] == m) { return true; }
	}
	return false;
};

/*
1. push state to the history
2. apply the move
*/
Board.prototype.move = function (fromFile, fromRank, toFile, toRank, promotionPiece) {
	var capturedPiece = this.pieceAt(toFile,toRank); // if en passant capture, this is empty.

	var piece = this.pieceAt(fromFile,fromRank);
	var pieceColor = getColor(piece);
	var pieceType = getPieceType(piece);

	var promotion = (piece == (WHITE|PAWN) && toRank == 7) || (piece == PAWN && toRank == 0);

	// save state
	var state = 0;
	state =
		(fromFile) |
		(fromRank << 3) |
		(toFile << 6) |
		(toRank << 9) |
		(this.enPassant << 12) | 
		(this.whiteLongCastlingEnabled << 13) | 
		(this.whiteShortCastlingEnabled << 14) |
		(this.blackLongCastlingEnabled << 15) |
		(this.blackShortCastlingEnabled << 16) |
		(capturedPiece << 17) |
		((promotion & 1) << 18);

	this.history.push(state);
	
	// if pawn 2 forward, enable enPassant
	this.enPassant = 1 & (pieceType == PAWN && Math.abs(toRank - fromRank) == 2);

	// is castling?
	if (pieceType == KING && Math.abs(fromFile - toFile) == 2){
		this.setPiece(toFile,toRank,piece);
		this.setPiece(fromFile,fromRank,EMPTY);
		if (piece == (WHITE|KING)) {
			this.whiteLongCastlingEnabled = this.whiteShortCastlingEnabled = 0;
			if (toFile == 6) {
				this.setPiece(5,0, WHITE|ROOK);
				this.setPiece(7,0, EMPTY);
			} else {
				this.setPiece(3,0, WHITE|ROOK);
				this.setPiece(0,0, EMPTY);
			}
		} else {
			this.blackLongCastlingEnabled = this.blackShortCastlingEnabled = 0;
			if (toFile == 6) {
				this.setPiece(5,7, ROOK);
				this.setPiece(7,7, EMPTY);
			} else {
				this.setPiece(3,7, ROOK);
				this.setPiece(0,7, EMPTY);
			}
		}
	}
	// is en passant capture?
	else if (pieceType == PAWN && fromFile != toFile && capturedPiece == EMPTY) {
		if (pieceColor == WHITE) {
			this.setPiece(toFile,toRank-1, EMPTY);
		} else {
			this.setPiece(toFile,toRank+1, EMPTY);
		}
		this.setPiece(fromFile,fromRank, EMPTY);
	}
	// is promotion?
	else if (promotion) {
		this.setPiece(toFile,toRank, promotionPiece);
	}
	// no special move
	if (true) {
		this.move_updateCastlingAbility(fromFile, piece);
		if (!promotion) {
			this.setPiece(toFile,toRank,piece);
		}
		this.setPiece(fromFile,fromRank, EMPTY);
	}
	this.toggleTurn();
	this.redrawCallback();
};

Board.prototype.move_updateCastlingAbility = function(fromFile, piece) {
	var pieceType = getPieceType(piece);
	var pieceColor = getColor(piece);
	if (pieceType == ROOK) {
		if (pieceColor == WHITE) {
			if (fromFile == 0 && this.whiteLongCastlingEnabled) {
				this.whiteLongCastlingEnabled = 0;
			} else if (fromFile == 7 && this.whiteShortCastlingEnabled) {
				this.whiteShortCastlingEnabled = 0;
			}
		} else {
			if (fromFile == 0 && this.blackLongCastlingEnabled) {
				this.blackLongCastlingEnabled = 0;
			} else if (fromFile == 7 && this.blackShortCastlingEnabled) {
				this.blackShortCastlingEnabled = 0;
			}
		}
	} else if (pieceType == KING) {
		if (pieceColor == WHITE) {
			this.whiteLongCastlingEnabled = 0;
			this.whiteShortCastlingEnabled = 0;
		} else {
			this.blackLongCastlingEnabled = 0;
			this.blackShortCastlingEnabled = 0;
		}
	}
};

/*
1. apply the inverse move
2. pop the state from the history
3. apply popped state
*/
Board.prototype.undo = function() {
	if (this.history.length == 0) return;
	var state = this.history.pop();
	var fromFile = state & 7;
	var fromRank = (state >> 3) & 7;
	var toFile = (state >> 6) & 7;
	var toRank = (state >> 9) & 7;
	var enPassant = (state >> 12) & 1;
	var whiteLongCastlingEnabled = (state >> 13) & 1;
	var whiteShortCastlingEnabled = (state >> 14) & 1;
	var blackLongCastlingEnabled = (state >> 15) & 1;
	var blackShortCastlingEnabled = (state >> 16) & 1;
	var capturedPiece = (state >> 17) & 15;
	var promotion = (state >> 18) & 1;

	var piece = this.pieceAt(toFile,toRank);
	var pieceType = getPieceType(piece);
	var pieceColor = getColor(piece);

	// apply inverse move
	// if castling
	if (pieceType == KING && Math.abs(fromFile - toFile) == 2) {
		this.setPiece(fromFile,fromRank,piece);
		this.setPiece(toFile,toRank,EMPTY);
		if (pieceColor == WHITE) {
			// short castling
			if (toFile == 6) {
				this.setPiece(7,0, WHITE|ROOK);
				this.setPiece(5,0, EMPTY);
			} 
			// long castling
			else {
				this.setPiece(0,0, WHITE|ROOK);
				this.setPiece(3,0, EMPTY);
			}
		} else {
			// short castling
			if (toFile == 6) {
				this.setPiece(7,7, ROOK);
				this.setPiece(5,7, EMPTY);
			}
			// long castling
			else {
				this.setPiece(0,7, ROOK);
				this.setPiece(3,7, EMPTY);
			}
		}
	} else {
		// if en passant capture
		if (pieceType == PAWN && toFile != fromFile && capturedPiece == EMPTY) {
			if (pieceColor == WHITE) {
				this.setPiece(toFile,toRank-1, PAWN);
			} else {
				this.setPiece(toFile,toRank+1, WHITE|PAWN);
			}
		}
		if (promotion) {
			this.setPiece(fromFile,fromRank, PAWN | pieceColor);
		} else {
			this.setPiece(fromFile,fromRank, piece);
		}
		this.setPiece(toFile,toRank,capturedPiece);
	}

	// apply popped state
	this.enPassant = enPassant;
	this.whiteLongCastlingEnabled = whiteLongCastlingEnabled;
	this.whiteShortCastlingEnabled = whiteShortCastlingEnabled;
	this.blackLongCastlingEnabled = blackLongCastlingEnabled;
	this.blackShortCastlingEnabled = blackShortCastlingEnabled;
	
	this.toggleTurn();
	this.redrawCallback();
};

Board.prototype.setPiece = function (file,rank,piece){
    this.array[idx(file,rank)] = piece;
};

Board.prototype.evaluate = function() { return evaluate(this); };

Board.prototype.toggleTurn = function() { 
    this.turn = this.turn == WHITE ? BLACK : WHITE;
};



function evaluate(board) {
    var score = 0;
    var pieceValueFactor = 10; // play around with these
    var threatValueFactor = 3;
    var moveValueFactor = 2;

    for (var file=0; file<8; file++){
        for (var rank=0; rank<8; rank++){
            score += getPieceValueAt(board,file,rank) * pieceValueFactor;
            score += getThreatValueAt(board,file,rank) * threatValueFactor;
            score += getMoveValueAt(board,file,rank) * moveValueFactor;
        }
    }
    score += (board.turn == WHITE) ? 0.5 : -0.5;
    return score;
}

function getMovePatternsForPiece(pieceType){
    switch (pieceType) {
        case PAWN: 
            return {
                attacks: [[-1,1],[1,1]],
                movements: [/*if first move*/[0,2],/*otherwise*/[0,1]]
            };
        case ROOK: return [[-1,0],[0,1],[1,0],[0,-1]];
        case KNIGHT: return [[-1,2],[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1]];
        case BISHOP: return [[-1,1],[1,1],[1,-1],[-1,-1]];
        case QUEEN: 
        case KING: return [[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]];
    }
}

// Returns an array of short move format:
// (promotionPiece << 12) | (toRank << 9) | (toFile << 6) | (fromRank << 3) | fromFile
Board.prototype.getMovesAt = function(file,rank){
    var piece = this.pieceAt(file,rank);
    var pieceType = getPieceType(piece);
    var col = getColor(piece);
	var ocol = col == WHITE ? BLACK : WHITE; // opposite col
    var moves = [];
    if (pieceType == PAWN) {
		var deltaRank = -1;
		if (col == WHITE) {
			deltaRank = 1;
		} 
		if (this.pieceAt(file,rank+deltaRank) == EMPTY) {
			moves.push(createMove(file,rank, file, rank+deltaRank));
		}
		if (this.pieceAt(file,rank+2*deltaRank) == EMPTY && ((rank == 1 && col == WHITE) || (rank == 6 && col == BLACK))) {
			moves.push(createMove(file,rank, file, rank + 2*deltaRank));
		}

		// attack
		var d = this.pieceAt(file-1,rank+deltaRank);
		if (d != EMPTY && getColor(d) == ocol) {
			moves.push(createMove(file,rank, file-1, rank+deltaRank));
		}
		d = this.pieceAt(file+1, rank+deltaRank);
		if (d != EMPTY && getColor(d) == ocol) {
			moves.push(createMove(file,rank, file+1, rank+deltaRank));
		}
		
		// en passant attack
		if (this.enPassant) {
			var prevMove = this.history[this.history.length-1];
			var prevRank = getRankFrom(prevMove);
			var prevFile = getFileFrom(prevMove);
			
			if ((col == WHITE && prevRank == 6 && rank == 4) || (col == BLACK && prevRank == 1 && rank == 3)){
				if (prevFile == file - 1) {
					moves.push(createMove(file,rank, file-1, rank+deltaRank));
				} else if (prevFile == file + 1) {
					moves.push(createMove(file,rank, file+1, rank+deltaRank));
				}
			}
		}
    }
	else if (pieceType == ROOK || pieceType == BISHOP || pieceType == KING || pieceType == QUEEN) {
		var movePatterns = getMovePatternsForPiece(pieceType);
		for (var moveIdx = 0; moveIdx < movePatterns.length; moveIdx++) {
			var movePattern = movePatterns[moveIdx];
			var deltaFile = movePattern[0];
			var deltaRank = movePattern[1];
			var toFile = file;
			var toRank = rank;
			while (true) {
				toFile += deltaFile;
				toRank += deltaRank;
				if (toFile < 0 || toFile > 7 || toRank < 0 || toRank > 7) { break; }
				var p = this.pieceAt(toFile, toRank);
				if (p == EMPTY || (p != EMPTY && getColor(p) == ocol)) {
					moves.push(createMove(file,rank,toFile,toRank));
				}
				if (p != EMPTY) { break; }
			}
		}
	}
    else if (pieceType == KNIGHT) {
		var mps = getMovePatternsForPiece(pieceType);
		for (var m = 0; m < mps.length; m++) {
			var mp = mps[m];
			var df = mp[0];
			var dr = mp[1];
			var f = file+df;
			var r = rank+dr;
			var p = this.pieceAt(f,r);
			if (f >= 0 && f <= 7 &&
				r >= 0 && r <= 7 && (
					p == EMPTY || (p != EMPTY && getColor(p) == ocol))) {
				moves.push(createMove(file,rank,f,r));
			}
		}
    }
	return moves;
};

function createMove(fileFrom,rankFrom,fileTo,rankTo,promotionPiece){
	promotionPiece |= 0;
	return fileFrom | (rankFrom<<3) | (fileTo<<6) | (rankTo<<9) | (promotionPiece<<12);
}

function getFileFrom(move) {
	return move & 7;
}

function getRankFrom(move) {
	return (move>>3) & 7;
}

function getFileTo(move) {
	return (move>>6) & 7;
}

function getRankTo(move) {
	return (move>>9) & 7;
}

function getPieceValueAt(board,file,rank) {
    var score = 0;
    p = board.pieceAt(file,rank);
    switch (p & 7) { 
        case EMPTY: return 0;
        case PAWN: score = 1; break;
        case KNIGHT: score = 3; break;
        case ROOK: score = 5; break;
        case BISHOP: score = 4; break;
        case QUEEN: score = 10; break;
        case KING: score = 100000; break;
    }
    if (isBlack(p)) { score *= -1; }
    return score;
}

function getThreatValueAt(board,file,rank){
    var score = 0;
    var piece = board.pieceAt(file,rank);
    if (piece == EMPTY) { return 0; }

    var p = piece & 7;
    var enemy = EMPTY;
    if (p == PAWN) {
        return getPawnThreatValueAt(board,file,rank);
    } else if (p == ROOK){
        return getRookThreatValueAt(board,file,rank);
    } else if (p == KNIGHT) {
        return getKnightThreatValueAt(board,file,rank);
    } else if (p == BISHOP){
        return getBishopThreatValueAt(board,file,rank);
    } else if (p == QUEEN){
        return getQueenThreatValueAt(board,file,rank);
    } else if (p == KING) {
        return getKingThreatValueAt(board,file,rank);
    }

    return score;
}

function getPawnThreatValueAt(board,file,rank) {
    var piece = board.pieceAt(file,rank);
    if ((getPieceType(piece)) != PAWN) { return 0; }

    var score = 0;
    if (isBlack(piece)) {
        // can kill left
        if (isColoredPieceAt(board, WHITE, file-1, rank-1)) { score += 1; }

        // can kill right
        if (isColoredPieceAt(board, WHITE, file+1, rank-1)) { score += 1; }
    } else {
        // can kill left
        if (isColoredPieceAt(board, BLACK, file-1, rank+1)) { score += 1; }

        // can kill right
        if (isColoredPieceAt(board, BLACK, file+1, rank+1)) { score += 1; }
    }
    if (isBlack(piece)) score *= -1;
    return score;
}

function getRookThreatValueAt(board,file,rank,extending) {
    if (extending == undefined) extending = true;
    var piece = board.pieceAt(file,rank);
    var pieceType = getPieceType(piece);
    if (pieceType != ROOK && pieceType != QUEEN && pieceType != KING) { return 0; }

    var score = 0;
    var i = 0;
    var dfs = [-1, 0, 1, 0];
    var drs = [0, -1, 0, 1];
    for (i; i<4; i++){ // 4 directions
        var f = file + dfs[i];
        var r = rank + drs[i];
        while (isInside(f,r)) {
            var p = board.pieceAt(f,r);
            if (p != EMPTY) {
                if (getColor(p) != getColor(piece)) ++score;
                else break;
            }
            f += dfs[i];
            r += drs[i];
            if (!extending) break;
        }
    }
    if (isBlack(piece)) score *= -1;
    return score;
}

function getBishopThreatValueAt(board,file,rank,extending){
    if (extending == undefined) extending = true;
    var piece = board.pieceAt(file,rank);
    var pieceType = getPieceType(piece);
    if (pieceType != BISHOP) { return 0; }

    var score = 0;
    var i = 0;
    var dfs = [-1, -1, 1, 1];
    var drs = [-1, 1, -1, 1];
    for (i; i<4; i++){ // 4 directions
        var f = file + dfs[i];
        var r = rank + drs[i];
        while (isInside(f,r)) {
            var p = board.pieceAt(f,r);
            if (p != EMPTY) {
                if (getColor(p) != getColor(piece)) ++score;
                else break;
            }
            f += dfs[i];
            r += drs[i];
            if (!extending) break;
        }
    }
    if (isBlack(piece)) score *= -1;
    return score;
}

function getQueenThreatValueAt(board,file,rank){
    if (getPieceType((board.pieceAt(file,rank))) != QUEEN) { return 0; }
    var s1 = getBishopThreatValueAt(board,file,rank,true);
    var s2 = getRookThreatValueAt(board,file,rank,true);
    var score = s1 + s2;
    return score;
}

function getKingThreatValueAt(board,file,rank){
    if ((getPieceType(board.pieceAt(file,rank))) != KING) { return 0; }
    var s1 = getBishopThreatValueAt(board,file,rank,false);
    var s2 = getRookThreatValueAt(board,file,rank,false);
    var score = s1 + s2;
    return score;
}

function getKnightThreatValueAt(board,file,rank){
    var piece = board.pieceAt(file,rank);
    var pieceType = getPieceType(piece);
    if (pieceType != KNIGHT) { return 0; }
    var score = 0;
    var dfs = [-1, 1, 2, 2, 1, -1, -2, -2];
    var drs = [2, 2, 1, -1, -2, -2, -1, 1];
    for (var i=0; i < 8; i++){
        var f = file + dfs[i];
        var r = rank + drs[i];
        if (isInside(f,r)) {
            var p = board.pieceAt(f,r);
            if (p != EMPTY){
                if (getColor(p) != getColor(piece)) ++score;
            }
        }
    }
    if (isBlack(piece)) score *= -1;
    return score;
}

function getMoveValueAt(board,file,rank){
    var piece = board.pieceAt(file,rank);
    var pieceType = getPieceType(piece);
    if (pieceType == PAWN) {
        return getPawnMoveValueAt(board,file,rank);
    } else if (pieceType == ROOK) {
        return getRookMoveValueAt(board,file,rank);
    } else if (pieceType == BISHOP){
        return getBishopMoveValueAt(board,file,rank);
    } else if (pieceType == KNIGHT){
        return getKnightMoveValueAt(board,file,rank);
    } else if (pieceType == QUEEN){
        return getQueenMoveValueAt(board,file,rank);
    } else if (pieceType == KING){
        return getKingMoveValueAt(board,file,rank);
    }

    return 0;
}

function getPawnMoveValueAt(board,file,rank){
    var piece = board.pieceAt(file,rank);
    var pieceType = getPieceType(piece);
    if (pieceType != PAWN) { return 0; }
    var pieceColor = getColor(piece);
    var dfs = [1,2];
    var isUnmoved = 
        (pieceColor == WHITE && rank == 1) ||
        (pieceColor == BLACK && rank == 6);
    var score = 0;
    if (pieceColor == WHITE) {
        if (board.pieceAt(file,rank+1) == EMPTY) ++score;
        if (isUnmoved && board.pieceAt(file,rank+2) == EMPTY) ++score;
    } else {
        if (board.pieceAt(file,rank-1) == EMPTY) ++score;
        if (isUnmoved && board.pieceAt(file,rank-2) == EMPTY) ++score;
    }
    if (isBlack(piece)) score *= -1;
    return score;
}

function getRookMoveValueAt(board,file,rank,extending){
    if (extending == undefined) extending = true;
    var piece = board.pieceAt(file,rank);
    var pieceType = getPieceType(piece);
    if (pieceType != ROOK && pieceType != QUEEN && pieceType != KING) return 0;
    var dfs = [-1, 0, 1, 0];
    var drs = [0, 1, 0, -1];
    var score = 0;
    for (var i=0; i<4; i++){
        var f = file+dfs[i];
        var r = rank+drs[i];
        while (isInside(f,r)) {
            if (board.pieceAt(f,r) == EMPTY) ++score;
            f += dfs[i];
            r += drs[i];
            if (!extending) break;
        }
    }
    if (isBlack(piece)) score *= -1;
    return score;
}

function getBishopMoveValueAt(board,file,rank,extending){
    if (extending == undefined) extending = true;
    var piece = board.pieceAt(file,rank);
    var pieceType = getPieceType(piece);
    if (pieceType != BISHOP && pieceType != QUEEN && pieceType != KING) return 0;
    var dfs = [-1, 1, 1, -1];
    var drs = [1, 1, -1, -1];
    var score = 0;
    for (var i=0; i<4; i++){
        var f = file+dfs[i];
        var r = rank+drs[i];
        while (isInside(f,r)) {
            if (board.pieceAt(f,r) == EMPTY) ++score;
            f += dfs[i];
            r += drs[i];
            if (!extending) break;
        }
    }
    if (isBlack(piece)) score *= -1;
    return score;
}

function getQueenMoveValueAt(board,file,rank){
    var s1 = getBishopMoveValueAt(board,file,rank,true);
    var s2 = getRookMoveValueAt(board,file,rank,true);
    return s1+s2;
}

function getKingMoveValueAt(board,file,rank){
    var s1 = getBishopMoveValueAt(board,file,rank,false);
    var s2 = getRookMoveValueAt(board,file,rank,false);
    return s1+s2;
}

function getKnightMoveValueAt(board,file,rank){
    var piece = board.pieceAt(file,rank);
    var pieceType = getPieceType(piece);
    if (pieceType != KNIGHT) return 0;
    var dfs = [-1, 1, 2, 2, 1, -1, -2, -2];
    var drs = [2, 2, 1, -1, -2, -2, -1, 1];
    var score = 0;
    for(var i=0; i<8; i++){
        var f = file+dfs[i];
        var r = rank+drs[i];
        if (isInside(f,r) && board.pieceAt(f,r) == EMPTY) ++score;
    }
    if (isBlack(piece)) score *= -1;
    return score;
}

function idx(file,rank) { return file + (rank*8); }

function isEmpty(board,file,rank) {
    return board.pieceAt(file,rank) == EMPTY;
}

function isColoredPieceAt(board,col,file,rank){
    if (!isInside(file,rank)) return false;
    var p = board.pieceAt(file,rank);
    if (getPieceType(p) == EMPTY) { return false; }
    if (col == WHITE) { return isWhite(p); }
    return isBlack(p);
}

function isInside(file,rank) {
    return file >= 0 && file <= 7 && rank >= 0 && rank <= 7;
}

function isBlack(piece) { if (piece == EMPTY) throw "isBlack called on empty field"; return (piece & 8) == 0; }
function isWhite(piece) { if (piece == EMPTY) throw "isWhite called on empty field"; return !isBlack(piece); }

function getColor(piece) { return piece & 8; }
function getPieceType(piece) { return piece&7; }

