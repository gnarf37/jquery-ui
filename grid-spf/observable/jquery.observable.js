(function ($) {
	$.observable = function( data, options ) {
		return $.isArray( data )
			? new ArrayObservable( data )
			: new ObjectObservable( data );
	};

	var splice = [].splice;

	function ObjectObservable( data ) {
		if ( !this.data ) {
			return new ObjectObservable( data );
		}

		this._data = data;
		return this;
	};

	$.observable.Object = ObjectObservable;

	ObjectObservable.prototype = {
		_data: null,

		data: function() {
			return this._data;
		},

		setProperty: function( path, value ) { 
			if ( $.isArray( path ) ) {
				// This is the array format generated by serializeArray.
				// TODO: We've discussed an "objectchange" event to capture all N property updates here.
				for ( var i = 0, l = path.length; i < l; i++ ) {
					var pair = path[i];
					this.setProperty( pair.name, pair.value );
				}
			} else if ( typeof( path ) === "object" ) {
				// Object representation where property name is path and property value is value.
				// TODO: We've discussed an "objectchange" event to capture all N property updates here.
				for ( var key in path ) {
					this.setProperty( key, path[ key ])
				}
			} else {
				// Simple single property case.
				var setter, property, 
					object = this._data,
					leaf = getLeafObject( object, path );

				path = leaf[1];
				leaf = leaf[0];
				if ( leaf ) {
					property = leaf[ path ];
					if ( $.isFunction( property )) {
						// Case of property setter/getter - with convention that property() is getter and property( value ) is setter
						setter = property;
						property = property.call( leaf );	//get
					}
					if ( property !== value ) {
						if ( setter ) {
							setter.call( leaf, value );		//set
							value = setter.call( leaf );	//get updated value
						} else {
							leaf[ path ] = value;
						}
						$( object ).triggerHandler( "propertyChange", { path: path, value: value });
					}
				}
			}
			return this; 
		} 
	};

	function getLeafObject( object, path ) {
		if ( object && path ) {
			var parts = path.split(".");

			path = parts.pop();
			while ( object && parts.length ) {
				object = object[ parts.shift() ];
			}
			return [ object, path ];
		}
		return [];
	};

	function ArrayObservable( data ) {
		if ( !this.data ) {
			return new ArrayObservable( data );
		}

		this._data = data;
		return this;
	};

	function triggerArrayEvent( array, eventArgs ) {
		$([ array ]).triggerHandler( "arrayChange", eventArgs );
	}

	$.observable.Array = ArrayObservable;

	ArrayObservable.prototype = {
		_data: null,

		data: function() {
			return this._data;
		},

		insert: function( index ) {
			var items = [].slice.call( arguments, 1 );
			if ( items.length > 0 ) {
				splice.apply( this._data, [ index, 0 ].concat( items ));
				triggerArrayEvent( this._data, { change: "insert", index: index, items: items });
			}
		},

		remove: function( index, numToRemove ) {
			numToRemove = ( numToRemove === undefined || numToRemove === null ) ? 1 : numToRemove;
			if ( numToRemove ) {
				var items = this._data.slice( index, index + numToRemove );
				this._data.splice( index, numToRemove );
				triggerArrayEvent( this._data, { change: "remove", index: index, items: items });
			}
		},

		move: function( oldIndex, newIndex, numToMove ) {
			numToMove = ( numToMove === undefined || numToMove === null ) ? 1 : numToMove;
			if ( numToMove ) {
				var items = this._data.slice( oldIndex, oldIndex + numToMove );
				var observable = $.observable( this._data );
				triggerArrayEvent( this._data, { change: "move", oldIndex: oldIndex, index: index, items: items });
			}
		},

		refresh: function( newItems ) {
			splice.apply( this._data, [ 0, this._data.length ].concat( newItems ));
			triggerArrayEvent( this._data, { change: "refresh" });
		}
	};

})(jQuery);

